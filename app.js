import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import GUI from 'lil-gui'
import gsap from 'gsap'
import fragmentShader from './shaders/fragment.glsl'
import vertexShader from './shaders/vertex.glsl'

import { HoloEffect } from './HoloEffect'

import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass'
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass'

import model from './human.glb'
import env from './env.jpg'

export default class Sketch {
	constructor(options) {
		
		this.scene = new THREE.Scene()
		
		this.container = options.dom
		
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		
		
		// // for renderer { antialias: true }
		this.renderer = new THREE.WebGLRenderer({ antialias: true })
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height)
		this.renderer.setSize(this.width ,this.height )
		this.renderer.setClearColor(0x050505, 1)
		this.renderer.useLegacyLights = true
		this.renderer.outputEncoding = THREE.sRGBEncoding
 

		 
		this.renderer.setSize( window.innerWidth, window.innerHeight )

		this.container.appendChild(this.renderer.domElement)
 


		this.camera = new THREE.PerspectiveCamera( 70,
			 this.width / this.height,
			 0.01,
			 10
		)
 
		this.camera.position.set(-1, 0, 0) 
		this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.time = 0


		this.dracoLoader = new DRACOLoader()
		this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
		this.gltf = new GLTFLoader()
		this.gltf.setDRACOLoader(this.dracoLoader)


		this.renderer.toneMapping = THREE.ACESFilmicToneMapping
		this.renderer.toneMappingExposure = .7

		this.isPlaying = true
	 
		this.settings()
		this.initPost()
		this.addObjects()		 
		this.resize()
		this.render()
		this.setupResize()
	 
	}

	initPost() {
		this.renderScene = new RenderPass(this.scene, this.camera)
		this.bloomPass = new UnrealBloomPass(new THREE.Vector2(this.width, this.height), 
		1.5,0.4, 0.85)
		this.bloomPass.threshold = this.settings.bloomThreshold
		this.bloomPass.strength = this.settings.bloomStrength
		this.bloomPass.radius = this.settings.bloomRadius


		//use new postproseccing effect
		this.holoEffect = new ShaderPass(HoloEffect)
		 
		this.composer = new EffectComposer(this.renderer)
		this.composer.addPass(this.renderScene)
		this.composer.addPass(this.bloomPass)

		//use new postproseccing effect
		this.composer.addPass(this.holoEffect)
	}


	settings() {
		let that = this
		this.settings = {
			progress: 0,
			exposure: 2,
			bloomStrength: 3,
			bloomThreshold: 0.05,
			bloomRadius: 0.8
		}
		this.gui = new GUI()
		this.gui.add(this.settings, 'exposure', 0, 3, 0.01).onChange(() => {
			that.renderer.toneMappingExposure = this.settings.exposure
		})
	
		this.gui.add(this.settings, 'progress', 0, 3, 0.01).onChange(() => {
			that.holoEffect.uniforms.progress.value = this.settings.progress
		})
	
		this.gui.add(this.settings, 'bloomStrength', 0, 3, 0.01).onChange((value) => {
			that.bloomPass.strength = value
		})
		this.gui.add(this.settings, 'bloomThreshold', 0, 3, 0.01).onChange((value) => {
			that.bloomPass.threshold = value
		})
		this.gui.add(this.settings, 'bloomRadius', 0, 3, 0.01).onChange((value) => {
			that.bloomPass.radius = value
		})
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this))
	}

	resize() {
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		this.renderer.setSize(this.width, this.height)
		this.camera.aspect = this.width / this.height
		this.composer.setSize(this.width, this.height)

		this.imageAspect = 853/1280
		let a1, a2
		if(this.height / this.width > this.imageAspect) {
			a1 = (this.width / this.height) * this.imageAspect
			a2 = 1
		} else {
			a1 = 1
			a2 = (this.height / this.width) * this.imageAspect
		} 


		// this.material.uniforms.resolution.value.x = this.width
		// this.material.uniforms.resolution.value.y = this.height
		// this.material.uniforms.resolution.value.z = a1
		// this.material.uniforms.resolution.value.w = a2

		this.camera.updateProjectionMatrix()



	}


	addObjects() {
		this.pmremGenerator = new THREE.PMREMGenerator(this.renderer)
		this.pmremGenerator.compileEquirectangularShader()

		this.envMap = new THREE.TextureLoader().load(env, texture => {
			this.envMap = this.pmremGenerator.fromEquirectangular(texture).texture
			// this.envMap.mapping = THREE.EquirectangularReflectionMapping
			// this.scene.environment = envMap
			// texture.dispose()
			
			this.pmremGenerator.dispose()



			this.gltf.load(model, gltf => {
			 
				this.scene.add(gltf.scene)
				this.human = gltf.scene.children[0]
				this.human.scale.set(0.1, 0.1, 0.1)
				this.human.geometry.center()
				// this.human.material = new THREE.MeshBasicMaterial({
				// 	color: 0xff6600
				// })
				// this.human.traverse(o => {
				// 	if(o.isMesh) {
				// 		o.material.wireframe = false
				// 	}
				// })
				this.m = new THREE.MeshStandardMaterial({
					metalness: 1,
					roughness: 0.28
				})
				this.m.envMap = this.envMap


				this.m.onBeforeCompile = shader => {

					shader.uniforms.uTime = {value: 0}
					shader.fragmentShader = `
					uniform float uTime;
					mat4 rotationMatrix(vec3 axis, float angle) {
						axis = normalize(axis);
						float s = sin(angle);
						float c = cos(angle);
						float oc = 1.0 - c;
						
						return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
										oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
										oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
										0.0,                                0.0,                                0.0,                                1.0);
				  }
				  
				  vec3 rotate(vec3 v, vec3 axis, float angle) {
					  mat4 m = rotationMatrix(axis, angle);
					  return (m * vec4(v, 1.0)).xyz;
				  }



					` + shader.fragmentShader


				  shader.fragmentShader = shader.fragmentShader.replace(
						`#include <envmap_physical_pars_fragment>`,
						`
						#if defined( USE_ENVMAP )
							vec3 getIBLIrradiance( const in vec3 normal ) {
								#if defined( ENVMAP_TYPE_CUBE_UV )
									vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
									vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
									return PI * envMapColor.rgb * envMapIntensity;
								#else
									return vec3( 0.0 );
								#endif
							}
							vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
								#if defined( ENVMAP_TYPE_CUBE_UV )
									vec3 reflectVec = reflect( - viewDir, normal );
									// Mixing the reflection with the normal is more accurate and keeps rough objects from gathering light from behind their tangent plane.
									reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
									reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
									
									reflectVec = rotate(reflectVec, vec3(1.0, 0.0, 0.0), uTime * 0.05);
									
									vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
									return envMapColor.rgb * envMapIntensity;
								#else
									return vec3( 0.0 );
								#endif
							}
						#endif
						`
				  )

					this.m.userData.shader = shader
				}


				this.human.material = this.m
			})
		})

		 




		// let that = this
		// this.material = new THREE.ShaderMaterial({
		// 	extensions: {
		// 		derivatives: '#extension GL_OES_standard_derivatives : enable'
		// 	},
		// 	side: THREE.DoubleSide,
		// 	uniforms: {
		// 		time: {value: 0},
		// 		resolution: {value: new THREE.Vector4()}
		// 	},
		// 	vertexShader,
		// 	fragmentShader
		// })
		
		// this.geometry = new THREE.PlaneGeometry(1,1,1,1)
		// this.plane = new THREE.Mesh(this.geometry, this.material)
 
		// this.scene.add(this.plane)
 
	}



	addLights() {
		const light1 = new THREE.AmbientLight(0xeeeeee, 0.5)
		this.scene.add(light1)
	
	
		const light2 = new THREE.DirectionalLight(0xeeeeee, 0.5)
		light2.position.set(0.5,0,0.866)
		this.scene.add(light2)
	}

	stop() {
		this.isPlaying = false
	}

	play() {
		if(!this.isPlaying) {
			this.isPlaying = true
			this.render()
		}
	}

	render() {
		if(!this.isPlaying) return
		this.time += 0.05
		//this.material.uniforms.time.value = this.time
		 
		//this.renderer.setRenderTarget(this.renderTarget)
		// this.renderer.render(this.scene, this.camera)
		//this.renderer.setRenderTarget(null)
		this.composer.render(this.scene, this.camera)

		requestAnimationFrame(this.render.bind(this))
		if(this.human) {
			if(this.m.userData.shader) {
		 
				this.human.material.userData.shader.uniforms.uTime.value = this.time
		
				this.holoEffect.uniforms.uTime.value = this.time
			}
			this.human.rotation.y = this.time * 0.05
		}
	}
 
}
new Sketch({
	dom: document.getElementById('container')
})
 