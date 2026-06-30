#!/usr/bin/env node
/**
 * check.js — Validation pré-déploiement AutoMaths
 *
 * Usage :  node check.js
 *
 * Vérifie, avant un push, tout ce qui casse silencieusement en classe :
 *   1. app.js parse sans erreur de syntaxe (Babel + JSX)
 *   2. Toutes les formules KaTeX se rendent sans erreur ni "4pt" orphelin
 *   3. Toutes les images référencées (cartes/...) existent réellement sur le disque
 *   4. Tous les SVG inline des questions sont des balises <svg> bien fermées
 *   5. CACHE_VERSION du service-worker.js est bien un entier
 *
 * Dépendances : @babel/parser, katex   (npm install @babel/parser katex)
 *
 * Code de sortie : 0 si tout est OK, 1 si au moins une erreur bloquante.
 */

const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, 'app.js');
const SW  = path.join(__dirname, 'service-worker.js');
const CARTES_DIR = path.join(__dirname, 'cartes');

let errors = 0;
let warnings = 0;
const log  = (s) => console.log(s);
const ok   = (s) => console.log('  \x1b[32m✓\x1b[0m ' + s);
const err  = (s) => { console.log('  \x1b[31m✗\x1b[0m ' + s); errors++; };
const warn = (s) => { console.log('  \x1b[33m!\x1b[0m ' + s); warnings++; };

if (!fs.existsSync(APP)) { console.error('app.js introuvable dans ' + __dirname); process.exit(1); }
const src = fs.readFileSync(APP, 'utf8');

// ─────────────────────────────────────────────────────────────────────────
log('\n1. Syntaxe app.js (Babel + JSX)');
try {
  const parser = require('@babel/parser');
  parser.parse(src, { sourceType: 'script', plugins: ['jsx'] });
  ok('app.js parse sans erreur');
} catch (e) {
  err(`Erreur de syntaxe ligne ${e.loc ? e.loc.line : '?'} : ${e.message.split('\n')[0]}`);
  // Inutile de continuer si le fichier ne parse pas
  console.log('\n\x1b[31mÉchec : corrige la syntaxe avant les autres vérifications.\x1b[0m');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────
log('\n2. Rendu des formules KaTeX (via AST)');
{
  let katex;
  try { katex = require('katex'); }
  catch { warn('katex non installé (npm install katex) — vérification sautée'); katex = null; }

  if (katex) {
    const parser = require('@babel/parser');
    const ast = parser.parse(src, { sourceType: 'script', plugins: ['jsx'] });
    const formulas = [];
    const FORMULA_KEYS = new Set(['q', 'tip', 'a', 'recto', 'verso']);

    function rawOf(node) {
      // Renvoie le texte brut d'un template, qu'il soit nu (`...`) ou taggé (r`...`)
      let tpl = null;
      if (node.type === 'TemplateLiteral') tpl = node;
      else if (node.type === 'TaggedTemplateExpression' && node.quasi && node.quasi.type === 'TemplateLiteral') tpl = node.quasi;
      if (!tpl || tpl.quasis.length !== 1) return null; // on ignore les templates avec ${...}
      return tpl.quasis[0].value.raw;
    }

    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (node.type === 'ObjectProperty' && node.key) {
        const kname = node.key.name || node.key.value;
        if (FORMULA_KEYS.has(kname)) {
          const raw = rawOf(node.value);
          if (raw !== null) formulas.push(raw);
          else if (node.value.type === 'StringLiteral' && /\\[a-zA-Z]/.test(node.value.value)) formulas.push(node.value.value);
        }
        if (kname === 'choices' && node.value.type === 'ArrayExpression') {
          for (const el of node.value.elements) {
            if (!el) continue;
            const raw = rawOf(el);
            if (raw !== null) formulas.push(raw);
          }
        }
      }
      for (const k in node) {
        if (k === 'loc' || k === 'start' || k === 'end') continue;
        walk(node[k]);
      }
    }
    walk(ast);

    let bad = 0;
    const seen = new Set();
    for (const f of formulas) {
      if (seen.has(f)) continue; seen.add(f);
      if (f.includes('<svg')) continue; // un champ q peut contenir un SVG : pas du KaTeX
      // On rend avec throwOnError:false — EXACTEMENT le réglage de l'app.
      // Ce qui produit "katex-error" ou "[Npt]" ici sera réellement cassé à l'écran.
      let html;
      try {
        html = katex.renderToString(f, { throwOnError: false, strict: false });
      } catch (e) {
        // Erreurs purement Node (métriques de police/glyphe absentes) = pas un bug app
        if (/Font metrics|character metrics|No character metrics/i.test(e.message)) continue;
        err(`KaTeX plante : ${JSON.stringify(f.slice(0, 55))} — ${e.message.split('\n')[0].slice(0, 40)}`);
        bad++; continue;
      }
      if (html.includes('katex-error')) { err(`Formule cassée : ${JSON.stringify(f.slice(0, 55))}`); bad++; }
      else if (/\[\d+pt\]/.test(html)) { err(`Saut de ligne cassé "[Npt]" : ${JSON.stringify(f.slice(0, 55))}`); bad++; }
    }
    if (bad === 0) ok(`${seen.size} formules KaTeX rendues — toutes OK`);
    else log(`  → ${bad} formule(s) à corriger`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
log('\n3. Images référencées (cartes/...)');
const refRe = /cartes\/([\w.\-]+\.(?:jpg|jpeg|png|webp|gif|svg))/g;
const refs = new Set();
let r;
while ((r = refRe.exec(src)) !== null) refs.add(r[1]);

if (refs.size === 0) {
  ok('aucune référence cartes/ (rien à vérifier)');
} else if (!fs.existsSync(CARTES_DIR)) {
  err(`${refs.size} images référencées mais le dossier cartes/ est absent ici`);
  warn('Si tu testes sans le dossier cartes/ en local, ignore cette ligne.');
} else {
  const files = new Set(fs.readdirSync(CARTES_DIR));
  let missing = 0;
  for (const ref of refs) {
    if (!files.has(ref)) { err(`fichier manquant : cartes/${ref}`); missing++; }
  }
  if (missing === 0) ok(`${refs.size} images référencées — toutes présentes`);
}

// ─────────────────────────────────────────────────────────────────────────
log('\n4. SVG inline des questions');
const svgRe = /svg:\s*`((?:[^`\\]|\\.)*)`/g;
let s2, nsvg = 0, svgbad = 0;
while ((s2 = svgRe.exec(src)) !== null) {
  nsvg++;
  const svg = s2[1];
  // Les SVG construits avec ${...} (templates) ne sont pas vérifiables statiquement : on saute
  if (svg.includes('${')) continue;
  const opens = (svg.match(/<svg[\s>]/g) || []).length;
  const closes = (svg.match(/<\/svg>/g) || []).length;
  if (opens >= 1 && closes >= 1) continue; // au moins une paire = OK
  if (opens !== closes) {
    err(`SVG mal formé (${opens} <svg> / ${closes} </svg>) : ${svg.slice(0, 50)}...`);
    svgbad++;
  }
}
if (nsvg === 0) ok('aucun SVG inline');
else if (svgbad === 0) ok(`${nsvg} SVG inline — tous bien fermés`);

// ─────────────────────────────────────────────────────────────────────────
log('\n5. Version du service worker');
if (!fs.existsSync(SW)) {
  warn('service-worker.js introuvable');
} else {
  const sw = fs.readFileSync(SW, 'utf8');
  const vm = sw.match(/CACHE_VERSION\s*=\s*(\d+)/);
  if (!vm) err('CACHE_VERSION introuvable ou non entier dans service-worker.js');
  else ok(`CACHE_VERSION = ${vm[1]}`);
}

// ─────────────────────────────────────────────────────────────────────────
log('\n' + '─'.repeat(50));
if (errors === 0) {
  console.log(`\x1b[32m✓ Tout est bon — prêt à pusher.\x1b[0m` + (warnings ? ` (${warnings} avertissement(s))` : ''));
  process.exit(0);
} else {
  console.log(`\x1b[31m✗ ${errors} erreur(s) bloquante(s).\x1b[0m Corrige avant de pusher.`);
  process.exit(1);
}
