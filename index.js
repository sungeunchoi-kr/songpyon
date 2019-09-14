var host = 'http://tspv.sungeunchoi.com:8080';

var camera, scene, renderer, controls;
var lblCurrentT = null;
var lblCurrentDistance = null;
var lblCitiesCt = null;
var lblToursCt = null;

var clickableMeshes = [];

var selectedObject = null;
var selectedObjectHistory = [];

var DESCENDER_ADJUST = 1.28;

window.addEventListener('load', async function() {
    loadUIComponents();
    initializeThreeJsEnvironment();

    let model = await loadModel();
    console.log("Loaded model: %O", model);

    let state = {
        currentTourIndex: 0,
        line: null 
    };

    // setup the scene using the model (drawing cities, etc)
    setupScene(model);

    // setup the diagnostic panel labels.
    lblCitiesCt.text(model.v.length);
    //lblToursCt.text(model.tours.length);

    //setInterval(() => modifyState(state, model), 100);

    animate();
    render();

    // Handling clicks on threejs objects:
    // https://www.pericror.com/software/creating-3d-objects-with-click-handlers-using-three-js/
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
 
    function onDocumentMouseDown(event) {
        event.preventDefault();
 
        mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
 
        raycaster.setFromCamera(mouse, camera);
 
        var intersects = raycaster.intersectObjects(clickableMeshes);
        if (intersects.length > 0) {
            selectedObjectHistory.push(selectedObject)
            //console.log('pushing to selectedObjectHistory: %O', selectedObject)
            selectedObject = intersects[0].object;
            intersects[0].object.callback();
        } else {
            selectedObject = null;
        }

        if (selectedObject && selectedObjectHistory[selectedObjectHistory.length-1]) {
            let a = selectedObjectHistory[selectedObjectHistory.length-1].data.cycles
            let b = selectedObject.data.cycles
            let inv = inverseCycle(a, 5)
            let e = composeCycles(inv, b, 5)
            console.log(printCycle(e))
        }
    }

    function onDocumentMouseMove(event) { }

    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    $(document).on("keypress", function (e) {
        // use e.which
        console.log(e.which)
        if ('s'.charCodeAt() === e.which) {
            selectedObject.data.cycles = composeCycles(
                selectedObjectHistory[selectedObjectHistory.length - 1].data.cycles,
                [[1,2,3,4,5]], 5)

            console.log('A5.v['+selectedObject.data.index +'].cycles = '
                + JSON.stringify(selectedObject.data.cycles))
        } else if ('t'.charCodeAt() === e.which) {
            selectedObject.data.cycles = composeCycles(
                selectedObjectHistory[selectedObjectHistory.length - 1].data.cycles,
                [[1,2],[3,4]], 5)

            console.log('A5.v['+selectedObject.data.index +'].cycles = '
                + JSON.stringify(selectedObject.data.cycles))
        }
    });
});

function loadUIComponents() {
    lblCitiesCt = $('#lbl-cities-ct');
    lblToursCt = $('#lbl-tours-ct');
    lblCurrentT = $('#lbl-current-t');
    lblCurrentDistance = $('#lbl-current-dist');
}

/**
 * Initialize the camera, scene, renderer, and controls.
 * For better or for worse, they are set globally.
 */
function initializeThreeJsEnvironment() {
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
    //camera = new THREE.PerspectiveCamera(70, viewportAspect, 0.01, 10);
    camera.position.z = 1.4;

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    let c = document.getElementById('canvas3d');
    c.appendChild(renderer.domElement);

    controls = new THREE.TrackballControls(camera);
    controls.addEventListener('change', render);
}

function setupScene(model) {
    let geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);

    let wireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0x22222233, linewidth: 1 }));

    wireframe.rotation.x += 45;
    wireframe.rotation.y += 45;
    wireframe.rotation.z += 45;
    scene.add(wireframe);

    ///let light = new THREE.AmbientLight(0x404040, 1);
    //scene.add(light)

    // Draw the points.
    let vi = 0
    model.v.forEach(p => {
        if (p.isA5) var color = 0x00ff00
        else var color = 0xaaaaaa
        var point = new THREE.Mesh(
            new THREE.SphereGeometry(0.015), //, 0.033, 0.033),
            //new THREE.MeshNormalMaterial());
            new THREE.MeshBasicMaterial({color: color}));
        
        point.position.x = p.x || 0.0;
        point.position.y = p.y || 0.0;
        point.position.z = p.z || 0.0;

        scene.add(point);

        point.data = {
            index: vi,
            cycles: model.v[vi].cycles || null,
            isA5: p.isA5,
        }
        point.callback = () => {
            console.log(`v[${point.data.index}]`)
        }
        clickableMeshes.push(point)

        if (p.cycles) {
            let label = makeTextSprite(
                '   ' + printCycle(p.cycles),
                p.x, p.y, p.z,
                {
                    fontsize: 72,
                    fontface: "Times New Roman",
                    borderColor: {r:0, g:0, b:255, a:1.0},
                    textColor: {r:255, g:255, b:255, a:1.0},
                    borderThickness: 0,
                    radius: 10,
                    fillColor: {r:255, g:255, b:255, a:0.0},
                    vAlign: "center",
                    hAlign: "left"
                }
            )
            scene.add(label)
        }

        ++vi
    });

    model.e.forEach(e => {
        let v0 = new THREE.Vector3(e[0].x, e[0].y, e[0].z)
        let v1 = new THREE.Vector3(e[1].x, e[1].y, e[1].z)

        if (e.isA5)
            var color = 0xff0000
        else
            var color = 0x0000aa

        let edge = 
            cylinderMesh(
                v0, v1,
                0.005,
                new THREE.MeshBasicMaterial({ color: color }))

        scene.add(edge)
    })
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
}

function render() {
    renderer.render(scene, camera);
}

async function loadModel() {
    A5.v.forEach(v => v.isA5 = true)
    A5.e.forEach(e => e.isA5 = true)
    S5.v.forEach(v => v.isA5 = false)
    S5.e.forEach(e => e.isA5 = false)

    return {
        v: A5.v.concat(S5.v),
        e: A5.e.concat(S5.e),
    };
}

function cylinderMesh(pointX, pointY, radius, material) {
    var direction = new THREE.Vector3().subVectors(pointY, pointX);
    var orientation = new THREE.Matrix4();
    orientation.lookAt(pointX, pointY, new THREE.Object3D().up);
    orientation.multiply(new THREE.Matrix4().set(1, 0, 0, 0,
        0, 0, 1, 0,
        0, -1, 0, 0,
        0, 0, 0, 1));
    var edgeGeometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 8, 1);
    var edge = new THREE.Mesh(edgeGeometry, material);
    edge.applyMatrix(orientation);

    // position based on midpoints - there may be a better solution than this
    edge.position.x = (pointY.x + pointX.x) / 2;
    edge.position.y = (pointY.y + pointX.y) / 2;
    edge.position.z = (pointY.z + pointX.z) / 2;

    return edge;
}

/**
 * Build a text sprite.  We use canvas to write the label in 2D then create a texture
 * from the canvas.  Three.js extracts the raster from the canvas and composites that
 * into the center of the texture.
 */
function makeTextSprite( message, x, y, z, parameters )
{
    if ( parameters === undefined ) parameters = {};
    var fontface = parameters.hasOwnProperty("fontface") ?
        parameters["fontface"] : "Arial";
    var fontsize = parameters.hasOwnProperty("fontsize") ?
        parameters["fontsize"] : 18;
    var borderThickness = parameters.hasOwnProperty("borderThickness") ?
        parameters["borderThickness"] : 4;
    var borderColor = parameters.hasOwnProperty("borderColor") ?
        parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
    var fillColor = parameters.hasOwnProperty("fillColor") ?
        parameters["fillColor"] : undefined;
    var textColor = parameters.hasOwnProperty("textColor") ?
        parameters["textColor"] : { r:0, g:0, b:255, a:1.0 };
    var radius = parameters.hasOwnProperty("radius") ?
                parameters["radius"] : 6;
    var vAlign = parameters.hasOwnProperty("vAlign") ?
                        parameters["vAlign"] : "center";
    var hAlign = parameters.hasOwnProperty("hAlign") ?
                        parameters["hAlign"] : "center";
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    // set a large-enough fixed-size canvas.  Both dimensions should be powers of 2.
    canvas.width  = 2048 / 2
    canvas.height = 2048 / 16
    context.font = fontsize + "px " + fontface;
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    // get size data (height depends only on font size)
    var metrics = context.measureText( message );
    var textWidth = metrics.width;
    /*
    // need to ensure that our canvas is always large enough
    // to support the borders and justification, if any
    // Note that this will fail for vertical text (e.g. Japanese)
    // The other problem with this approach is that the size of the canvas
    // varies with the length of the text, so 72-point text is different
    // sizes for different text strings.  There are ways around this
    // by dynamically adjust the sprite scale etc. but not in this demo...
    var larger = textWidth > fontsize ? textWidth : fontsize;
    canvas.width = larger * 4;
    canvas.height = larger * 2;
    // need to re-fetch and refresh the context after resizing the canvas
    context = canvas.getContext('2d');
    context.font = fontsize + "px " + fontface;
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    metrics = context.measureText( message );
    textWidth = metrics.width;
    console.log("canvas: " + canvas.width + ", " + canvas.height + ", texW: " + textWidth);
    */
    // find the center of the canvas and the half of the font width and height
    // we do it this way because the sprite's position is the CENTER of the sprite
    var cx = canvas.width / 2;
    var cy = canvas.height / 2;
    var tx = textWidth/ 2.0;
    var ty = fontsize / 2.0;
    // then adjust for the justification
    if ( vAlign === "bottom")
        ty = 0;
    else if (vAlign === "top")
        ty = fontsize;
    if (hAlign === "left")
        tx = 0;
    else if (hAlign === "right")
        tx = textWidth;
    // the DESCENDER_ADJUST is extra height factor for text below baseline: g,j,p,q. since we don't know the true bbox
    //roundRect(context, cx - tx , cy + ty + 0.28 * fontsize,
    //		textWidth, fontsize * DESCENDER_ADJUST, radius, borderThickness, borderColor, fillColor);
    // text color.  Note that we have to do this AFTER the round-rect as it also uses the "fillstyle" of the canvas
    context.fillStyle = getCanvasColor(textColor);
    context.fillText( message, cx - tx, cy + ty);
    // draw some visual references - debug only
    //drawCrossHairs( context, cx, cy );
    // outlineCanvas(context, canvas);
    //addSphere(x,y,z);
    // canvas contents will be used for a texture
    var texture = new THREE.Texture(canvas);
    texture.magFilter = THREE.NearestFilter;
    //texture.minFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.needsUpdate = true;
    var spriteMaterial = new THREE.SpriteMaterial( { map: texture } );
    var sprite = new THREE.Sprite( spriteMaterial );
    // we MUST set the scale to 2:1.  The canvas is already at a 2:1 scale,
    // but the sprite itself is square: 1.0 by 1.0
    // Note also that the size of the scale factors controls the actual size of the text-label
    //sprite.scale.set(4,2,1);
    sprite.scale.set(8/13, 1/13, 1);
    // set the sprite's position.  Note that this position is in the CENTER of the sprite
    sprite.position.set(x, y, z);
    return sprite;
}

/**
 * convenience for converting JSON color to rgba that canvas wants
 * Be nice to handle different forms (e.g. no alpha, CSS style, etc.)
 */
function getCanvasColor ( color ) {
    return "rgba(" + color.r + "," + color.g + "," + color.b + "," + color.a + ")";
}

/**
 * Just a debug feature to draw cross-hair for visual reference
 */
function drawCrossHairs ( context, cx, cy ) {
    context.strokeStyle = "rgba(0,255,0,1)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(cx-150,cy);
    context.lineTo(cx+150,cy);
    context.stroke();
    context.strokeStyle = "rgba(0,255,0,1)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(cx,cy-150);
    context.lineTo(cx,cy+150);
    context.stroke();
    context.strokeStyle = "rgba(0,255,0,1)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(cx-150,cy);
    context.lineTo(cx+150,cy);
    context.stroke();
    context.strokeStyle = "rgba(0,255,0,1)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(cx,cy-150);
    context.lineTo(cx,cy+150);
    context.stroke();
}
///////////////////////////////////////////////////////////////////

let lineMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.5
});
function modifyState(state, model) {
    state.currentTourIndex += 1;
    if (state.currentTourIndex >= model.tours.length) {
        state.currentTourIndex = 0;
    }

    if (state.line == null) {
        let g = new THREE.Geometry();
        modifyLineGeometry(g, model.tours[0], model.cities);
        g.dynamic = true;

        state.line = new THREE.Line(g, lineMaterial);
        scene.add(state.line);
    }

    let currentTour = model.tours[state.currentTourIndex];

    modifyLineGeometry(
        state.line.geometry,
        currentTour,
        model.cities
    );

    lblCurrentT.text(state.currentTourIndex + ' / ' + model.tours.length);
    lblCurrentDistance.text(currentTour.distance);

    render();
}

/**
 * @param g
 * @param tour
 * @param cities
 */
function modifyLineGeometry(g, tour, cities) {
    let home = cities[tour[0]];
    for (var i=0; i<tour.length; ++i) {
        var i_city = tour[i];
        if (g.vertices[i] == null)
            g.vertices[i] = new THREE.Vector3();

        g.vertices[i].x = cities[i_city][0];
        g.vertices[i].y = cities[i_city][1];
        g.vertices[i].z = cities[i_city][2];
    }

    g.vertices[i] = new THREE.Vector3(home[0], home[1], home[2]);
    g.verticesNeedUpdate = true;
}
