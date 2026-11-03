import json, os, sys, time, numpy as np, onnxruntime as ort
from PIL import Image
M=sys.argv[1] if len(sys.argv)>1 else '/home/claude/models/birefnet-lite.onnx'
so=ort.SessionOptions(); so.intra_op_num_threads=2; so.enable_cpu_mem_arena=False; so.graph_optimization_level=ort.GraphOptimizationLevel.ORT_DISABLE_ALL; so.enable_mem_pattern=False; so.execution_mode=ort.ExecutionMode.ORT_SEQUENTIAL
sess=ort.InferenceSession(M,so,providers=['CPUExecutionProvider'])
def alpha(im):
    W,H=im.size
    x=np.asarray(im.convert('RGB').resize((1024,1024),Image.BICUBIC)).astype(np.float32)/255
    x=(x-np.array([0.485,0.456,0.406]))/np.array([0.229,0.224,0.225])
    y=sess.run(None,{'input_image':x.transpose(2,0,1)[None].astype(np.float32)})[0][0,0]
    y=1/(1+np.exp(-y)); 
    return Image.fromarray((np.clip(y,0,1)*255).astype(np.uint8)).resize((W,H),Image.BICUBIC)
if __name__=='__main__':
    S=json.load(open('sources.json')); os.makedirs('alpha2',exist_ok=True)
    keys=sys.argv[2:] or list(S)
    for k in keys:
        if os.path.exists(f'alpha2/{k}.png'): continue
        t=time.time(); alpha(Image.open(S[k])).save(f'alpha2/{k}.png'); print(k, round(time.time()-t,1), flush=True)
