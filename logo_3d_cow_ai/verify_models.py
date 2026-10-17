import glob
import os
import struct
import numpy as np

def verify_stl(filepath):
    with open(filepath, 'rb') as f:
        header = f.read(80)
        num_triangles = struct.unpack('<I', f.read(4))[0]
        points = []
        for _ in range(num_triangles):
            data = struct.unpack('<12fH', f.read(50))
            points.extend([data[3:6], data[6:9], data[9:12]])
            
        pts = np.array(points)
        min_b = pts.min(axis=0)
        max_b = pts.max(axis=0)
        size = max_b - min_b
        
        # Check that dimensions are positive and under Bambu P1S limits
        valid_dims = (size[0] > 0 and size[1] > 0 and size[2] > 0)
        fits_p1s = (size[0] <= 256.0 and size[1] <= 256.0 and size[2] <= 256.0)
        
        return {
            'file': os.path.basename(filepath),
            'triangles': num_triangles,
            'width': size[0],
            'height': size[1],
            'depth': size[2],
            'valid': valid_dims and fits_p1s
        }

files = sorted(glob.glob('/home/lzambrano/Desarrollo/CollarNet/logo_3d_cow_ai/*.stl'))
print(f"{'Archivo STL':28s} | {'Triang':6s} | {'Ancho':7s} | {'Alto':7s} | {'Prof':6s} | {'Estado':6s}")
print("-" * 75)
all_ok = True
for f in files:
    res = verify_stl(f)
    status = "OK" if res['valid'] else "FAIL"
    if not res['valid']:
        all_ok = False
    print(f"{res['file']:28s} | {res['triangles']:6d} | {res['width']:5.1f}mm | {res['height']:5.1f}mm | {res['depth']:4.1f}mm | {status}")

print("-" * 75)
if all_ok:
    print(">>> VERIFICACIÓN COMPLETADA: TODOS LOS ARCHIVOS STL SON 100% APTOS PARA BAMBU P1S <<<")
else:
    print(">>> ADVERTENCIA: SE DETECTARON PROBLEMAS <<<")
