import subprocess

scad_template = """
caller_part = "none";
include </home/lzambrano/Desarrollo/CollarNet/diseno_halter_v2/collar_halter_v2.scad>;

ang = bridge_half_ang;
x_j = bridge_r_inner * sin(ang);
z_j = bridge_r_inner * cos(ang);

projection(cut = true)
    rotate([0, 90, 0])
        translate([-{x_val}, 0, 0])
            rotate([0, -ang, 0])
                translate([-x_j, 0, -z_j])
                    dorsal_bridge_body();
"""

for x in [0, 5, 10, 15, 20, 25, 30, 34]:
    with open('/tmp/slice.scad', 'w') as f:
        f.write(scad_template.format(x_val=x))
    res = subprocess.run(['openscad', '-o', f'/tmp/slice_{x}.dxf', '/tmp/slice.scad'], capture_output=True, text=True)
    with open(f'/tmp/slice_{x}.dxf') as f:
        lines = f.readlines()
    print(f"X={x}: {len(lines)} DXF lines")

