import json, os, numpy as np
from PIL import Image
from matte import alpha_of
old='/mnt/user-data/uploads/Downloads/غذا/'; new=old+'جدید/'
idx={int(k):v for k,v in json.load(open('index.json')).items()}
SRC={k:old+idx[i] for k,i in json.load(open('map.json')).items()}
nf=sorted(os.listdir(new))
for k,i in {'water':0,'latte':1,'cappuccino':2,'tahchin':3,'torsh':4,'soltani':5,'baghali':6,'lubia':7,'zereshk':8,'sabzi-mahi':9}.items(): SRC[k]=new+nf[i]
json.dump(SRC,open('sources.json','w'),ensure_ascii=False)
for k,p in SRC.items():
    if os.path.exists(f'alpha/{k}.png'): continue
    im=Image.open(p).convert('RGB'); alpha_of(im).save(f'alpha/{k}.png'); print(k,flush=True)
