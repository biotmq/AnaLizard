import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import * as TWEEN from '@tweenjs/tween.js';

let camera, scene, renderer, labelRenderer;
let tiles = [];
let labels = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let navigationStack = [];
const backButton = document.getElementById('back-button');

init();
animate();

function init() {
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 800;

    scene = new THREE.Scene();

    fetch('/datasets')
        .then(response => response.json())
        .then(datasets => {
            navigationStack.push(datasets);
            renderTiles(datasets);
        });

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    labelRenderer = new CSS3DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    document.getElementById('container').appendChild(labelRenderer.domElement);

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousedown', onDocumentMouseDown, false);
    backButton.addEventListener('click', onBackButtonClick);
}

function renderTiles(data) {
    // Clear existing tiles and labels
    tiles.forEach(tile => scene.remove(tile));
    labels.forEach(label => scene.remove(label));
    tiles = [];
    labels = [];

    const geometry = new THREE.BoxGeometry(150, 150, 150);
    let i = 0;
    data.forEach(item => {
        const object = new THREE.Mesh(
            geometry, 
            new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff, transparent: true, opacity: 1 })
        );
        object.position.x = (i % 4) * 400 - 600;
        object.position.y = Math.floor(i / 4) * 400 - 400;
        object.position.z = 0;
        object.userData = { name: item.name, children: item.children };
        scene.add(object);
        tiles.push(object);

        const labelDiv = document.createElement('div');
        labelDiv.className = 'label';
        labelDiv.textContent = item.name;
        const label = new CSS3DObject(labelDiv);
        label.position.copy(object.position);
        labels.push(label);
        scene.add(label);

        i++;
    });

    backButton.style.display = navigationStack.length > 1 ? 'block' : 'none';
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseDown(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(tiles);

    if (intersects.length > 0) {
        const target = intersects[0].object;
        const datasetName = target.userData.name;
        const nextLevelData = target.userData.children;

        // Animate other tiles flying away
        tiles.forEach(tile => {
            if (tile !== target) {
                new TWEEN.Tween(tile.position)
                    .to({ x: Math.random() * 2000 - 1000, y: Math.random() * 2000 - 1000, z: -2000 }, 1500)
                    .easing(TWEEN.Easing.Exponential.InOut)
                    .start();
                new TWEEN.Tween(tile.material)
                    .to({ opacity: 0 }, 1500)
                    .start();
            }
        });
        labels.forEach(label => {
             new TWEEN.Tween(label.element.style)
                    .to({ opacity: 0 }, 500)
                    .onComplete(() => scene.remove(label))
                    .start();
        });

        // Animate camera to zoom in
        new TWEEN.Tween(camera.position)
            .to({ x: target.position.x, y: target.position.y, z: target.position.z + 300 }, 1000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onComplete(() => {
                if (navigationStack.length === 1) { // First level
                    fetch(`/data?dataset=${datasetName}`)
                        .then(response => response.json())
                        .then(response => {
                            navigationStack.push(response.data);
                            renderTiles(response.data);
                            zoomOut();
                        });
                } else if (nextLevelData) {
                    navigationStack.push(nextLevelData);
                    renderTiles(nextLevelData);
                    zoomOut();
                }
            })
            .start();
    }
}

function onBackButtonClick() {
    if (navigationStack.length > 1) {
        navigationStack.pop();
        renderTiles(navigationStack[navigationStack.length - 1]);
    }
}

function zoomOut() {
    new TWEEN.Tween(camera.position)
        .to({ x: 0, y: 0, z: 800 }, 1000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}
