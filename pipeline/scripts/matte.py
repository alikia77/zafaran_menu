import json, os, sys, numpy as np, onnxruntime as ort
from PIL import Image, ImageFilter
sess=ort.InferenceSession('/home/claude/models/isnet.onnx', providers=['CPUExecutionProvider'])
inp=sess.get_inputs()[0].name
def alpha_of(im):
    W,H=im.size
    x=np.asarray(im.convert('RGB').resize((1024,1024),Image.BILINEAR)).astype(np.float32)/255.0
    x=(x-0.5)/1.0
    x=x.transpose(2,0,1)[None]
    y=sess.run(None,{inp:x})[0][0,0]
    y=(y-y.min())/(y.max()-y.min()+1e-6)
    m=Image.fromarray((y*255).astype(np.uint8)).resize((W,H),Image.LANCZOS)
    return m
if __name__=='__main__':
    src='/mnt/user-data/uploads/Downloads/غذا/'
    idx={int(k):v for k,v in json.load(open('index.json')).items()}
    for i in map(int,sys.argv[1:]):
        im=Image.open(src+idx[i]).convert('RGB'); m=alpha_of(im)
        out=im.convert('RGBA'); out.putalpha(m); out.thumbnail((500,500)); 
        bg=Image.new('RGBA',out.size,(40,30,22,255)); bg.alpha_composite(out); bg.convert('RGB').save(f'm{i}.jpg')
