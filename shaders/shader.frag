#version 330 core

in vec3 color;
in vec2 texc;
in vec2 uv;
out vec4 fragColor;

uniform float sunPosition;
uniform float roughness;
uniform sampler2D tex;
uniform int useTexture = 0;
uniform vec2 resolution;
vec3 light = normalize(vec3(sin(sunPosition/99.f*2)*10, sin(sunPosition/99.f*2)*40-10, sin(sunPosition/99.f*2-1)*100));
vec3 skylight = vec3(0.0, 1.0, 0.0);
float rrr = clamp(sin(sunPosition/99.f*2)*40, 0.0, 1.0);
float ggg = clamp(sin(sunPosition/99.f*2)*30, 0.0, 0.6);
float bbb = 0.2;

struct Sunshine {
    vec3 Direction;
    vec3 Color;
};

vec3 sampleTexture( sampler2D sam, in vec3 p, in vec3 n){
    return(abs(n.x)*texture(sam, p.yz) + abs(n.y)*texture(sam, p.xz) + abs(n.z)*texture(sam, p.xy)).xyz;
}

float f(vec3 p){
    return sin(p.x)*cos(p.z);
}

const float epsilon = 0.001;
vec2 e = vec2(epsilon, 0.0); // For swizzling
vec3 calcNormal(vec3 p) {
    float x = f(p - e.xyy) - f(p + e.xyy);
    float y = 2.0*epsilon;
    float z = f(p - e.yyx) - f(p + e.yyx);
    return normalize(vec3(x,y,z));
}

vec4 sky_gradient(vec3 rd, vec3 sunpos, float t){

    float y = gl_FragCoord.y / resolution.y;


    vec4 yellow = vec4(255, 250, 213, 255) / 255.f;
    vec4 burnt = vec4(251, 152, 20, 255) / 255.f;
    vec4 gold = vec4(255, 181, 17, 255) / 255.f;
    vec4 coral = vec4(233, 133, 129, 255) / 255.f;
    vec4 gray = vec4(208, 205, 220, 255) / 255.f;
    vec4 black = vec4(77, 85, 120, 255) / 255.f;

    vec4 candygrad = mix(gray, coral, smoothstep(0.5, 1.0, y));
    vec4 peakingthru = mix(coral, black, smoothstep(0.7, 1.0, y));
    vec4 swapper = (t >= -0.855) ? candygrad : peakingthru;

    vec4 blue = vec4(148,183,226, 255) / 255.f;
    vec4 lightblue = vec4(179, 208, 244, 255) / 255.f;

    float step1 = 0.0;
    float step2 = 0.4;
    float step3 = 1.0;


    vec4 color = mix(blue, lightblue, smoothstep(step1, step2, y* -t));
    color = mix(color, swapper, smoothstep(step2, step3, y* -t));

    float sun = max(pow(clamp(dot(rd,sunpos), 0.0, 1.0), 1000.0), 0.0);

    color += vec4(rrr, ggg, bbb, 1.0)*sun;
    return color;
}

float raymarch(vec3 ro, vec3 rd){
    float marchDist = 0.01;
    float boundingDist = 50.0;
    float threshold = 0.001;
    for(int i = 0; i < 12000; i++){
        vec3 p = ro + rd*marchDist;
        if(f(p) > p.y){
            return marchDist;
        }
        marchDist += 0.01;
    }
    return -1.0;
}


const vec3 MOUNTAIN_COLOR = vec3(66.0, 62.0, 56.0) / 255.0;
vec3 render(vec3 ro, vec3 rd, float t){
    vec3 pos = ro + rd*t;
    vec3 n = calcNormal(pos);

    n = normalize(n+roughness*normalize(sampleTexture(tex, pos, n)));

    float ambient = 0.1;
    float diffuse = clamp(dot(n, light), 0.0, 1.0);
    float specular = pow(clamp(dot(rd, reflect(light, n)), 0.0, 1.0), 32.0);
    float rr = clamp(sin(sunPosition/99.f*2)*5, 0.5, 1.0);
    float gg = clamp(sin(sunPosition/99.f*2)*4, 0.5, 1.0);
    float bb = 0.5;
    vec3 suncolor = vec3(rr, gg, bb);

    vec3 color = (pos.y > 0.6) ? vec3(1.0) : MOUNTAIN_COLOR;
    color *= vec3(suncolor.xy, 0.8);
    return color * (ambient + diffuse + specular);
}



void main() {
    vec3 rayOrigin = vec3(0.0, 3.5, 6.0);
    vec3 target = vec3(0.0);
    vec3 look = normalize(rayOrigin - target);
    vec3 up = vec3(0.0, 1.0, 0.0);

    vec3 cameraForward = -look;
    vec3 cameraRight = normalize(cross(cameraForward, up));
    vec3 cameraUp = normalize(cross(cameraRight, cameraForward));

    vec2 modified_uv = 2.0*(gl_FragCoord.xy/resolution.xy) - vec2(1.0);
    modified_uv.x *= resolution.x/resolution.y;

    vec3 rayDirection = vec3(modified_uv, 1.0);
    rayDirection = normalize(rayDirection.x * cameraRight + rayDirection.y * cameraUp + rayDirection.z * cameraForward);

    float t = raymarch(rayOrigin, rayDirection);
    vec3 col = vec3(0.0);
    if(t > 0.0){
        col = render(rayOrigin, rayDirection, t);
        fragColor = vec4(col, 1.0);
    } else {
        float time = 2.2*cos(0.1*sunPosition);
        fragColor = sky_gradient(rayDirection, light, sunPosition/99.f*2-1);
    }
}
