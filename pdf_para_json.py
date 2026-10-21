#!/usr/bin/env python3
"""
Converte um PDF em trechos pesquisáveis para a biblioteca da Ngola.

Instalação (uma vez):   pip install pypdf
Uso (na raiz do projeto):
    python ferramentas/pdf_para_json.py codigo_civil.pdf --area direito_contratual --livro "Código Civil" --versao 2024
    python ferramentas/pdf_para_json.py cgt.pdf --area direito_fiscal --livro "Código Geral Tributário" --versao 2023

Cria/atualiza:
    livros/<area>.json       trechos com id, livro, versão e página (usados pelo site)
    livros/index.json        lista de ficheiros
    livros/arquivo/...       versões antigas do mesmo livro (nunca se apaga nada)
    corpus/<area>.tsv        texto limpo "id<TAB>texto", pronto para treinar o modelo de palavras
"""
import argparse, json, re, sys, unicodedata
from collections import Counter
from datetime import date
from pathlib import Path
from pypdf import PdfReader

SO_NUMERO = re.compile(r"^\s*[-–—]?\s*(p[áa]g(ina)?\.?\s*)?\d{1,4}(\s*(de|/)\s*\d{1,4})?\s*[-–—]?\s*$", re.I)


def slug(txt):
    s = unicodedata.normalize("NFD", txt).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-") or "x"


def forma(linha):
    """'Página 12' e 'Página 13' ficam iguais, para detetar rodapés repetidos."""
    return re.sub(r"\d+", "#", re.sub(r"\s+", " ", linha.strip().lower()))


def bordas(linhas, n=3):
    """Índices das primeiras e últimas n linhas não vazias (onde ficam cabeçalhos e rodapés)."""
    idx = [i for i, l in enumerate(linhas) if l.strip()]
    return set(idx[:n] + idx[-n:])


def limpar(txt):
    txt = re.sub(r"-\n(?=[a-zà-ú])", "", txt)     # palavra cortada no fim da linha
    txt = re.sub(r"[ \t]+", " ", txt)
    return re.sub(r"\s*\n\s*", " ", txt).strip()


def dividir(texto, max_palavras):
    frases = re.split(r"(?<=[.;:!?])\s+", texto)
    trechos, atual, n = [], [], 0
    for f in frases:
        w = len(f.split())
        if atual and n + w > max_palavras:
            trechos.append(" ".join(atual)); atual, n = [], 0
        atual.append(f); n += w
    if atual:
        resto = " ".join(atual)
        if trechos and n < 25:
            trechos[-1] += " " + resto
        else:
            trechos.append(resto)
    return trechos


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf")
    ap.add_argument("--area", required=True)
    ap.add_argument("--livro", required=True, help="nome que aparece nas respostas")
    ap.add_argument("--versao", default=str(date.today().year), help="ano/edição do texto (por omissão: ano atual)")
    ap.add_argument("--saida", default="livros")
    ap.add_argument("--corpus", default="corpus")
    ap.add_argument("--max-palavras", type=int, default=150)
    a = ap.parse_args()

    paginas = [[l.strip() for l in (p.extract_text() or "").replace("\u00ad", "").splitlines()]
               for p in PdfReader(a.pdf).pages]

    # 1) descobrir cabeçalhos/rodapés: linhas das bordas que se repetem em muitas páginas
    contagem = Counter()
    for linhas in paginas:
        contagem.update({forma(linhas[i]) for i in bordas(linhas)})
    minimo = max(3, int(len(paginas) * 0.3))
    repetidas = {f for f, c in contagem.items() if c >= minimo} if len(paginas) >= 4 else set()

    # 2) limpar, dividir e dar um id estável a cada trecho
    base = f"{slug(a.livro)}-v{slug(a.versao)}"
    novos, sem_texto, removidas = [], [], 0
    for num, linhas in enumerate(paginas, start=1):
        pos = bordas(linhas)
        mantidas = []
        for i, l in enumerate(linhas):
            if i in pos and (SO_NUMERO.match(l) or forma(l) in repetidas):
                removidas += 1; continue
            mantidas.append(l)
        texto = limpar("\n".join(mantidas))
        if len(texto.split()) < 5:
            sem_texto.append(num); continue
        for n, t in enumerate(dividir(texto, a.max_palavras), start=1):
            novos.append({"id": f"{base}-p{num}-{n}", "livro": a.livro, "v": a.versao, "p": num, "t": t})

    if not novos:
        sys.exit("Nenhum texto encontrado. O PDF deve ser digitalizado (imagens): precisa de OCR primeiro.")

    # 3) juntar ao que já existe; versões antigas do mesmo livro vão para o arquivo
    pasta = Path(a.saida); (pasta / "arquivo").mkdir(parents=True, exist_ok=True)
    ficheiro = pasta / f"{a.area}.json"
    manter, arquivadas = [], {}
    if ficheiro.exists():
        for t in json.loads(ficheiro.read_text(encoding="utf-8"))["trechos"]:
            t.setdefault("v", "sem-versao"); t.setdefault("id", f"{slug(t['livro'])}-p{t['p']}")
            if t["livro"] != a.livro:
                manter.append(t)
            elif t["v"] != a.versao:
                arquivadas.setdefault(t["v"], []).append(t)
    for v, ts in arquivadas.items():
        (pasta / "arquivo" / f"{a.area}_{slug(a.livro)}_{slug(v)}.json").write_text(
            json.dumps({"area": a.area, "trechos": ts}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    todos = manter + novos
    ficheiro.write_text(json.dumps({"area": a.area, "trechos": todos}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    idx = pasta / "index.json"
    lista = json.loads(idx.read_text(encoding="utf-8"))["ficheiros"] if idx.exists() else []
    if ficheiro.name not in lista:
        lista.append(ficheiro.name)
    idx.write_text(json.dumps({"ficheiros": sorted(lista)}, ensure_ascii=False, indent=1), encoding="utf-8")

    # 4) corpus limpo para o Degrau 2 (id<TAB>texto, uma linha por trecho)
    cdir = Path(a.corpus); cdir.mkdir(parents=True, exist_ok=True)
    (cdir / f"{a.area}.tsv").write_text("\n".join(f"{t['id']}\t{t['t']}" for t in todos) + "\n", encoding="utf-8")

    print(f"✅ {a.livro} (versão {a.versao}): {len(paginas)} páginas, {len(novos)} trechos -> {ficheiro} ({ficheiro.stat().st_size // 1024} KB)")
    print(f"🧹 {removidas} linhas de cabeçalho/rodapé/número de página removidas")
    for v, ts in arquivadas.items():
        print(f"🗄️  versão antiga {v} ({len(ts)} trechos) guardada em {pasta / 'arquivo'}")
    if sem_texto:
        print(f"⚠️  {len(sem_texto)} páginas sem texto (imagens?): {sem_texto[:15]}{'...' if len(sem_texto) > 15 else ''}")


if __name__ == "__main__":
    main()
