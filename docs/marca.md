# Marca GlowScale

## O monograma

A marca e o monograma **GS**: um "G" geometrico - arco aberto a direita com a
barra classica - e um "S" ocupando essa abertura.

A escolha nao foi estetica apenas. O favicon vive a 16px, e ali quase toda
marca vira borrao. As primeiras versoes falharam exatamente nisso: com o traco
mais pesado o "S" fechava e virava um "8"; com a barra do G muito curta o "G"
lia como "6". A versao final foi ajustada olhando o desenho renderizado a
16px, 24px e 32px, nao so em tamanho grande.

Duas decisoes tecnicas sustentam isso:

- **So `path`, nunca `<text>`.** Um monograma em texto depende da fonte
  instalada na maquina de quem ve. Em path, o desenho e identico em qualquer
  navegador e em qualquer sistema.
- **Deslocamento optico de 0.7 unidade para a direita.** O conjunto GS tem
  mais massa a esquerda (o arco do G). Centralizar pela caixa deixa a marca
  visualmente torta; o empurrao sutil e o que faz parecer centrada.

## Onde a geometria vive

Os mesmos dois `path` aparecem em tres lugares. **Ao mexer na marca, mexa nos
tres:**

| Arquivo | Papel |
| --- | --- |
| `components/layout/glowscale-mark.tsx` | Marca dentro da aplicacao |
| `app/icon.svg` | Favicon (com variante para tema escuro) |
| `app/opengraph-image.png` / `app/apple-icon.png` | Imagens geradas |

## Paleta

Os tokens vivem em `app/globals.css` em `oklch`. O equivalente em hex, para
quando um SVG ou imagem precisar do valor literal:

| Token | Claro | Escuro |
| --- | --- | --- |
| `--primary` | `#9f4376` | `#df81b3` |
| `--primary-foreground` | `#fffafc` | - |
| `--background` | `#fffdfb` | `#1e191f` |
| `--foreground` | `#1e191f` | - |
| `--muted-foreground` | `#6d666f` | - |
| `--border` | `#e6e2e6` | - |
| `--success` | `#308e63` | - |
| `--accent` | `#f9ecf4` | - |

Ameixa-rosado sobre neutros quentes: e uma paleta de estetica e beleza sem
cair no rosa infantil, e o contraste do texto sobre o fundo passa em AA.

## Wordmark

"Glow" em peso normal, "Scale" em semibold, na serifa de display do tema
(`.texto-display`). A mudanca de peso separa as duas palavras sem precisar de
espaco extra nem de uma segunda cor.

## Favicon e tema escuro

`app/icon.svg` traz um `@media (prefers-color-scheme: dark)` embutido: no tema
escuro o tile clareia e o glifo escurece. Sem isso, um tile ameixa escuro
some na barra de abas escura do navegador.

## Imagens sociais

`app/opengraph-image.png` (1200x630) e `app/twitter-image.png` sao estaticos,
gerados uma vez e versionados. A alternativa - gerar em runtime com
`next/og` - exigiria embarcar um arquivo de fonte e custaria uma renderizacao
por request, sem ganho: o conteudo nao muda.

Os arcos decorativos no canto direito ecoam a curva do G, ligando a imagem
social ao monograma sem repetir o simbolo.

Cada imagem tem seu `.alt.txt` ao lado, que o Next usa como texto alternativo.

## Regenerando as imagens

Os PNGs foram renderizados com Chromium headless a partir de HTML. Para
refazer, monte o HTML com a marca e rode:

```bash
chromium --headless --no-sandbox --screenshot=app/opengraph-image.png \
  --window-size=1200,630 file:///caminho/para/og.html
```
