include <collar_halter_v2.scad>

$fn = 36;

module probeta_cuello_capsula_perfecta() {
    coupon_l = cradle_depth + 12.0; // 47 mm total: 35 mm embone + 12 mm asa de agarre
    
    color(col_body) {
        difference() {
            // 1. Cuerpo exterior escalonado (con chaflán delantero calzador en X=0)
            intersection() {
                pod_stepped_shell();
                translate([-5, -5, -2])
                    cube([coupon_l + 5, pod_w + 10, pod_base_h + 5]);
            }

            // 2. Túnel pasacorreas continuo inferior (52 mm)
            translate([-10, (pod_w - strap_slot_w)/2, tunnel_t])
                cube([coupon_l + 20, strap_slot_w, tunnel_h]);

            // 3. Pasacables central (Ø8 mm)
            translate([-5, pod_w/2, 8.0])
                rotate([0, 90, 0]) cylinder(r=conduit_d/2, h=coupon_l + 10, $fn=24);

            // 4. Muescas laterales para click mecánico en cuna de TPU
            translate([click_x - 0.5, cradle_wall - 0.2, click_z - click_h/2 - 0.5])
                cube([click_l + 1.0, click_depth + 0.5, click_h + 1.0]);
            translate([click_x - 0.5, pod_w - cradle_wall - click_depth - 0.3, click_z - click_h/2 - 0.5])
                cube([click_l + 1.0, click_depth + 0.5, click_h + 1.0]);

            // 5. Cavidad interior hueca uniforme con paredes sólidas de 3 mm (ahorro de peso y tiempo)
            translate([cradle_wall + 3.0, cradle_wall + 3.0, tunnel_t + tunnel_h + 2.5])
                r_box(coupon_l - 2*(cradle_wall + 3.0) + 5.0, 
                      pod_w - 2*(cradle_wall + 3.0), 
                      pod_base_h + 5.0, 2.0);
        }
    }
}

probeta_cuello_capsula_perfecta();
