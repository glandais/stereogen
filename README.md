# Stereogen

Générateur d'autostéréogrammes à partir de photos.

Upload une image, le serveur estime la carte de profondeur avec [Depth Anything V2](https://huggingface.co/depth-anything/Depth-Anything-V2-Base-hf), puis le navigateur génère l'autostéréogramme en utilisant un pattern au choix.

## Lancement local

```bash
cd server
pip install -r requirements.txt
uvicorn main:app --reload
```

Ouvrir http://localhost:8000

Le premier lancement télécharge le modèle (~390 MB).

## Docker

```bash
docker build -t stereogen .
docker run -p 8000:8000 stereogen
```

## Architecture

```
stereogen/
├── server/
│   ├── main.py              # FastAPI, endpoint POST /api/depth
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── app.js               # Algorithme stéréogramme (Thimbleby et al. 1994)
│   └── patterns/             # 10 patterns PNG tileable
└── Dockerfile
```

- **Backend** : FastAPI, Depth Anything V2 Base via Hugging Face `transformers`
- **Frontend** : Vanilla HTML/JS/Canvas, pas de framework
- **Algorithme** : Basé sur Thimbleby et al. 1994, traitement du centre vers les bords

## Utilisation

1. Uploader une photo
2. Choisir un pattern
3. Régler l'amplitude de profondeur et la largeur du pattern
4. Générer et télécharger l'autostéréogramme

## Régénérer les patterns

```bash
cd frontend/patterns
python generate_patterns.py
```
