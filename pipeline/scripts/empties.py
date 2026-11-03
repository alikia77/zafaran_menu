import os, json, numpy as np
from PIL import Image
from matte import alpha_of
src='/mnt/user-data/uploads/Downloads/غذا/لیوان خالی/'; fs=sorted(os.listdir(src))
E={'cola':0,'latte':1,'doogh':2,'espresso':3,'water':4,'tea':5,'lemonade':6}
for k,i in E.items():
    im=Image.open(src+fs[i]).convert('RGB'); im.save(f'empty/{k}.png'); alpha_of(im).save(f'empty/{k}_a.png'); print(k,flush=True)
