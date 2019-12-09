import spacy
import websockets
import asyncio
import json

from rasa_nlu.training_data import load_data
from rasa_nlu.config import RasaNLUModelConfig
from rasa_nlu.model import Trainer, Metadata, Interpreter
from rasa_nlu import config

# Chargement du dataset de l'entrainement
train_data = load_data('rasa_nlu/nlu.md')

# Creation du Trainer avec un fichier de config de spacy
trainer = Trainer(config.load('rasa_nlu/config_spacy.json'))

# Lancement de l'apprentissage avec un fichier de config de spacy
trainer.train(train_data)

# Cree le model du bot au dossier /models/rasa/
model_dir = trainer.persist('/models/rasa/')

# Creation du handler des messages recu par client WebSocket Angular
async def receiveMessage(websocket, path):
    while True:
        # Reception du message
        message = await websocket.recv()
        # Determination de l'intent a l'aide de Rasa et spacy
        intent = getIntent(message)
        # Envoyer l'intent au client
        await websocket.send(intent)


# Determiner l'intent et entities d'un message avec spacy et Rasa
def getIntent(message):
    nlp = spacy.load('en')
    doc = nlp(message)

    interpreter = Interpreter.load(model_dir)

    parsed_data = interpreter.parse(message)
    intent = parsed_data['intent']['name']
    result = {
        "intent": intent,
        "entities": {

        }
    }
    for entity in doc.ents:
        result['entities'][entity.text] = entity.label_
    print(result)
    return json.dumps(result)

# On demarre le serveur
server = websockets.serve(receiveMessage, 'localhost', 2000)
asyncio.get_event_loop().run_until_complete(server)
asyncio.get_event_loop().run_forever()
