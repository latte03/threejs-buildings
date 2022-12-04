import type { GeoJSON, GeoPoint } from '@/types'
import { getWindowRatio } from '@/utils'
import { getDistance, getRhumbLineBearing } from 'geolib'
import * as THREE from 'three'
import { Color } from 'three'
import { MapControls } from 'three/examples/jsm/controls/OrbitControls'
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils'
import Stats from 'three/examples/jsm/libs/stats.module'

import type { Ref } from 'vue'
type Point = {
  /**经度 */
  longitude: number
  /** 纬度 */
  latitude: number
}
const center: Point = {
  longitude: 120.7521346,
  latitude: 30.7579863
}

const MAT_BUILDING = new THREE.MeshPhongMaterial()

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(25, getWindowRatio(), 1, 100)
const renderer = new THREE.WebGLRenderer({ antialias: true })
const controls = new MapControls(camera, renderer.domElement)

const stats = Stats()

const geoBuildingsGroup: THREE.BufferGeometry[] = []

function useScene(cont: Ref<HTMLElement>) {
  function awake() {
    if (!cont.value) return

    // init scene
    scene.background = new Color(0x222222)

    // init camera
    camera.position.set(8, 4, 0)

    // init light
    const light0 = new THREE.AmbientLight(0xfafafa, 0.25)
    const light1 = new THREE.PointLight(0xfafafa, 0.4)
    light1.position.set(200, 90, 40)
    const light2 = new THREE.PointLight(0xeeeeee, 0.4)
    light1.position.set(200, 90, -40)

    scene.add(light0)
    scene.add(light1)
    scene.add(light2)

    const gh = new THREE.GridHelper(
      60,
      160,
      new Color(0x555555),
      new Color(0x333333)
    )
    scene.add(gh)

    // renderer

    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)

    cont.value.appendChild(renderer.domElement)
    //init controls

    controls.enableDamping = true
    controls.dampingFactor = 0.25
    controls.screenSpacePanning = false
    controls.maxDistance = 800

    cont.value.appendChild(stats.domElement)

    controls.update()

    animate()

    renderBuilding()
  }
  function animate() {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
    controls.update()
    stats.update()
  }

  function bindWindowResize() {
    window.addEventListener('resize', onWindowResize, false)
  }

  function onWindowResize() {
    camera.aspect = getWindowRatio()
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  return {
    scene,
    camera,
    renderer,
    controls,
    awake,
    bindWindowResize,
    onWindowResize
  }
}

async function renderBuilding() {
  const data = await getGeojson()
  loadBuildings(data)
}

function getGeojson(): Promise<GeoJSON> {
  return new Promise((resolve) => {
    fetch('/jiaxing.geojson')
      .then((res) => res.json())
      .then((res) => {
        console.log('%c Line:108 🥃 res', 'color:#f5ce50', res)
        resolve(res)
      })
  })
}

function loadBuildings(data: GeoJSON) {
  const { features } = data
  features.forEach((el, index) => {
    if (!el.properties) return
    el.geometry.coordinates.forEach((e, i) => {
      const shape = getShapes(e[0], center)
      const geometry = genGeometry(shape, {
        curveSegments: 1,
        depth: 0.01 * e[0][0][2],
        bevelEnabled: false
      })
      // geometry.rotateX(Math.PI / 2)
      // geometry.rotateZ(Math.PI)

      // const mesh = new THREE.Mesh(geometry, MAT_BUILDING)
      // scene.add(mesh)

      // 将所有的模型结合到一起，优化性能
      geoBuildingsGroup.push(geometry)
    })
  })

  const mergeGeometry = mergeBufferGeometries(geoBuildingsGroup, true)

  const mesh = new THREE.Mesh(mergeGeometry, MAT_BUILDING)
  scene.add(mesh)
}

function getShapes(points: GeoPoint[], center: Point) {
  const shape = new THREE.Shape()
  points.forEach((point, index) => {
    const position = { longitude: point[0], latitude: point[1] }
    const p = GPSRelativePosition(position, center)
    if (index == 0) {
      shape.moveTo(p[0], p[1])
    } else {
      shape.lineTo(p[0], p[1])
    }
  })
  const position = { longitude: points[0][0], latitude: points[0][1] }
  const p = GPSRelativePosition(position, center)
  shape.lineTo(p[0], p[1])

  return shape
}

function genGeometry(shape: THREE.Shape, config = {}) {
  const geometry = new THREE.ExtrudeGeometry(shape, config)
  geometry.computeBoundingBox()
  return geometry
}

function GPSRelativePosition(position: Point, center: Point) {
  const dis = getDistance(position, center)

  const bearing = getRhumbLineBearing(position, center)

  const x = center.longitude + dis * Math.cos((bearing * Math.PI) / 180)
  const y = center.latitude + dis * Math.sin((bearing * Math.PI) / 180)

  return [-x / 100, y / 100]
}

export { useScene }
