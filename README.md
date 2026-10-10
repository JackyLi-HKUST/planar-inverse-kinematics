# Two Links, One Target

A bilingual (English / Traditional Chinese), build-free educational website prototype for a MATH3900 project on 2-DOF planar robot-arm inverse kinematics.

Live site: <https://jackyli-hkust.github.io/two-links-one-target/>

## Open it

Open `index.html` directly in any modern browser. No internet connection, package installation, or build step is required.

For a local web server (optional):

```sh
python3 -m http.server 8000 --directory robot-arm-ik
```

Then visit `http://localhost:8000`.

## Publish on GitHub Pages

The site already uses relative links and includes `.nojekyll`, so it works both at `username.github.io` and at `username.github.io/repository-name/`.

### Option A: repository root

1. Create a GitHub repository.
2. Copy the contents of this `robot-arm-ik` folder into the repository root.
3. Commit and push.
4. In the repository, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select your main branch and the `/(root)` folder, then save.

### Option B: `docs/` folder

Copy the contents of this folder into a folder named `docs` in an existing repository. In **Settings → Pages**, select your main branch and `/docs`.

No GitHub Action or Jekyll build is required.

## Edit it

- `index.html` — live FK / IK playground
- `introduction.html` — mathematical motivation, FK/IK comparison, and project scope
- `guide.html` — notebook-style derivation
- `proof.html` — rigorous algebraic proof, full 0/1/2/∞ classification, and optional Jacobian analysis
- `about.html` — authorship, technology, references, acknowledgements, and AI-use disclosure
- `assets/styles.css` — layout and visual design
- `assets/i18n.js` — all English and Traditional Chinese interface text
- `assets/kinematics.js` — mathematical model (forward/inverse kinematics)
- `assets/playground.js` — home-page controls and robot drawing
- `assets/guide.js` — interactive notebook diagrams
- `assets/proof.js` — theorem explorer, reachable-annulus diagram, and Jacobian graph

The robot and diagrams are drawn with the browser Canvas API. Everything is local and self-contained.

`index.html` remains the default GitHub Pages entry point, so the published site opens directly on the playground. The Introduction is page 00, Rigorous proofs is page 03, and About & credits is page 04 in the sidebar.

## Image credits

- `assets/industrial-robot-arm.jpg` — Lexington Medical, Inc., via Wikimedia Commons, CC0.
- `assets/robot-arm-nih.png` — NIAID / Ryan Kissinger, via Wikimedia Commons, U.S. public domain.

## Mathematical convention

Angles are measured counter-clockwise. `θ₁` is the first link's angle from the positive x-axis. `θ₂` is the signed relative angle from link 1 to link 2.

Forward kinematics:

```text
x = L₁ cos θ₁ + L₂ cos(θ₁ + θ₂)
y = L₁ sin θ₁ + L₂ sin(θ₁ + θ₂)
```

Inverse kinematics:

```text
c₂ = (x² + y² − L₁² − L₂²) / (2L₁L₂)
θ₂ = ± acos(c₂)
θ₁ = atan2(y,x) − atan2(L₂ sin θ₂, L₁ + L₂ cos θ₂)
```

Reachability condition:

```text
|L₁ − L₂| ≤ √(x² + y²) ≤ L₁ + L₂
```

## Test the maths

With Node.js installed:

```sh
node tests/kinematics.test.js
```

## Accessibility and offline notes

- Keyboard-focusable controls and navigation
- Mobile sidebar and responsive layouts
- Reduced-motion preference respected
- Canvas diagrams have accessible labels; important values are also present as live text
- Rigorous formulas use native MathML for proper fractions, subscripts, operator spacing, and screen-reader structure
- No external fonts, scripts, trackers, or network requests

## References

The information architecture is inspired by [Just the Docs](https://just-the-docs.com/): a persistent documentation sidebar, responsive navigation, few dependencies, and content-first pages. The interactive presentation is informed by the visual direction of [robotkinematics.study](https://robotkinematics.study/) without copying its code.

OpenAI Codex assisted with implementation, interface iteration, testing, and documentation. The project author reviewed and revised the output and remains responsible for the submitted work.
