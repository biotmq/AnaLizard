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
const topButton = document.getElementById('top-button');
const screenshotButton = document.getElementById('screenshot-button');
const breadcrumbDiv = document.getElementById('breadcrumb');
const valueLabelDiv = document.getElementById('value-label');
const detailView = document.getElementById('detail-view');

init();
animate();

function init() {
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 3000);
    camera.position.z = 800;

    scene = new THREE.Scene();

    fetch('/datasets')
        .then(response => response.json())
        .then(datasets => {
            navigationStack.push({ data: datasets, level: 0, name: 'Datasets' });
            renderTiles(datasets, 0);
            updateBreadcrumb();
        });

    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
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
    topButton.addEventListener('click', onTopButtonClick);
    screenshotButton.addEventListener('click', onScreenshotButtonClick);
}

function getTreemapLayout(data, valueKey, bounds) {
    const totalValue = data.reduce((sum, item) => sum + (item[valueKey] || 0), 0);
    let layout = [];
    let currentX = bounds.x;
    let currentY = bounds.y;
    let remainingWidth = bounds.width;

    data.forEach(item => {
        const itemValue = item[valueKey] || 0;
        const percentage = totalValue > 0 ? itemValue / totalValue : 1 / data.length;
        const rectWidth = bounds.width * percentage;
        
        layout.push({ x: currentX, y: currentY, width: rectWidth, height: bounds.height });
        currentX += rectWidth;
    });

    return layout;
}

function renderTiles(data, level) {
    tiles.forEach(tile => scene.remove(tile));
    labels.forEach(label => scene.remove(label));
    tiles = [];
    labels = [];
    detailView.style.display = 'none';

    const currentState = navigationStack[navigationStack.length - 1];
    const valueKey = currentState.valueKey;

    const layout = valueKey ? 
        getTreemapLayout(data, valueKey, { x: -800, y: -400, width: 1600, height: 800 }) :
        data.map((item, i) => ({ 
            x: (i % 4) * 400 - 600, 
            y: Math.floor(i / 4) * 400 - 400, 
            width: 150, 
            height: 150 
        }));

    data.forEach((item, i) => {
        const rect = layout[i];
        const geometry = new THREE.BoxGeometry(rect.width, rect.height, 50);
        const object = new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff, transparent: true, opacity: 1 })
        );
        object.position.set(rect.x + rect.width / 2, rect.y + rect.height / 2, 0);
        object.userData = { name: item.name, children: item.children, level: level, itemData: item };
        scene.add(object);
        tiles.push(object);

        const labelDiv = document.createElement('div');
        labelDiv.className = 'label';
        labelDiv.textContent = item.name;
        const label = new CSS3DObject(labelDiv);
        label.position.copy(object.position);
        labels.push(label);
        scene.add(label);
    });

    backButton.style.display = navigationStack.length > 1 ? 'block' : 'none';
    topButton.style.display = navigationStack.length > 1 ? 'block' : 'none';
    updateBreadcrumb();
    valueLabelDiv.textContent = valueKey ? `Sized by: ${valueKey}` : '';
}

function updateBreadcrumb() {
    breadcrumbDiv.innerHTML = '';
    navigationStack.forEach((state, index) => {
        const span = document.createElement('span');
        span.textContent = state.name;
        if (index < navigationStack.length - 1) {
            span.textContent += ' > ';
        }
        breadcrumbDiv.appendChild(span);
    });
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
        const { name, children, level, itemData } = target.userData;

        tiles.forEach(tile => {
            if (tile !== target) {
                new TWEEN.Tween(tile.position).to({ z: -2000 }, 1500).easing(TWEEN.Easing.Exponential.InOut).start();
                new TWEEN.Tween(tile.material).to({ opacity: 0 }, 1500).start();
            }
        });
        labels.forEach(label => {
            new TWEEN.Tween(label.element.style).to({ opacity: 0 }, 500).onComplete(() => scene.remove(label)).start();
        });

        new TWEEN.Tween(camera.position)
            .to({ x: target.position.x, y: target.position.y, z: target.position.z + 300 }, 1000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onComplete(() => {
                if (level === 0) {
                    fetch(`/data?dataset=${name}`)
                        .then(res => res.json())
                        .then(res => {
                            const datasetConfig = navigationStack[0].data.find(d => d.name === name);
                            navigationStack.push({ data: res.data, level: 1, name: name, valueKey: datasetConfig.value_column });
                            renderTiles(res.data, 1);
                            zoomOut();
                        });
                } else if (children && children.length > 0) {
                    navigationStack.push({ data: children, level: level + 1, name: name, valueKey: navigationStack[navigationStack.length - 1].valueKey });
                    renderTiles(children, level + 1);
                    zoomOut();
                } else {
                    showDetailView(itemData);
                }
            })
            .start();
    }
}

function showDetailView(data) {
    detailView.innerHTML = '';
    for (const key in data) {
        if (key !== 'children') {
            const p = document.createElement('p');
            p.textContent = `${key}: ${data[key]}`;
            detailView.appendChild(p);
        }
    }
    detailView.style.display = 'block';
}

function onBackButtonClick() {
    if (navigationStack.length > 1) {
        navigationStack.pop();
        const previousState = navigationStack[navigationStack.length - 1];
        renderTiles(previousState.data, previousState.level);
    }
}

function onTopButtonClick() {
    if (navigationStack.length > 1) {
        navigationStack = [navigationStack[0]];
        const topState = navigationStack[0];
        renderTiles(topState.data, topState.level);
    }
}

function onScreenshotButtonClick() {
    const dataURL = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'screenshot.png';
    link.click();
}

function zoomOut() {
    new TWEEN.Tween(camera.position).to({ x: 0, y: 0, z: 800 }, 1000).easing(TWEEN.Easing.Quadratic.InOut).start();
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}