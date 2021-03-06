import {
    Engine
  } from "@babylonjs/core/Engines/engine";
  import {
    Scene
  } from "@babylonjs/core/scene";
  import {
    Vector3
  } from "@babylonjs/core/Maths/math";
  import {
    FreeCamera
  } from "@babylonjs/core/Cameras/freeCamera";
  import { 
    Camera
   } from "@babylonjs/core/Cameras/camera";
  import {
    MeshBuilder
    } from "@babylonjs/core/Meshes/meshBuilder";
  import { 
    PointLight
   } from "@babylonjs/core/Lights/pointLight";
   import { 
     Sound 
    } from "@babylonjs/core/Audio/sound";
  import { 
    KeyboardEventTypes
   } from "@babylonjs/core/Events/keyboardEvents";
  import {
    HemisphericLight
  } from "@babylonjs/core/Lights/hemisphericLight";
  import {
    Mesh
  } from "@babylonjs/core/Meshes/mesh";
  import { 
    UniversalCamera 
  } from "@babylonjs/core/Cameras/universalCamera";
  import { 
    StandardMaterial 
  } from "@babylonjs/core/Materials/standardMaterial";
  import { 
    Color3 
  } from "@babylonjs/core/";
  import { 
    JeelizResizer 
  } from "../node_modules/facefilter/helpers/JeelizResizer";
  import { 
    TransformNode 
  } from "@babylonjs/core/Meshes/transformNode";

  import "../node_modules/facefilter/dist/jeelizFaceFilter.module.js";
  import "@babylonjs/core/Audio/audioEngine";
  import "@babylonjs/core/Audio/audioSceneComponent";
  
  
"use strict";

// To start a server:
// npx webpack-dev-server

//Global variables:

//Create canvas object, engine and scene
var canvas = document.getElementById("jeeFaceFilterCanvas")
var engine = new Engine(canvas, true, null, true);
var scene = new Scene(engine);
var light = new HemisphericLight("Hemi", new Vector3(0, 5, 2), scene);
// camera and other are set later
var camera = null, ASPECTRATIO = -1;
var ISDETECTED = false;
var boxFM= null, boxFL= null, boxFR= null, boxSub=null, boxSL = null, boxSR = null;
var musicFL= null, musicFR= null, musicFM= null, musicSub= null, musicSR= null, musicSL= null;
var distanceFromScreen= null, screenCenterY=null, screenWidth=null, screenHeight=null;
var soundsReady = 0, sphereMaterial = null, speakerMaterial = null;
var sphereMusicFL = null, sphereMusicFM = null, sphereMusicFR = null, sphereMusicSub = null, sphereMusicSR = null, sphereMusicSL = null;
var musicControll = false, firstDetection=true;
var audioListenerSphere = null;
var pivot = null;

// SETTINGS of this demo:
const SETTINGS = {
    rotationOffsetX: 0, // negative -> look upper. in radians
    cameraFOV: 40,      // in degrees, 3D camera FOV
    pivotOffsetYZ: [0.2,0.2], // XYZ of the distance between the center of the cube and the pivot
    detectionThreshold: 0.5,  // sensibility, between 0 and 1. Less -> more sensitive
    detectionHysteresis: 0.1,
    scale: 1 // scale of the 3D cube
  };

//Estimate screen width for sound source placement
//NOTE: this is estimation it is not very accurate but for this project it is acurate enought
// Used by create_BabylonCamera
function estimate_ScreenParams() {
  var $el = document.createElement('div');
  $el.style.width = '1cm';
  $el.style.height = '1cm';
  $el.style.backgroundColor = '#ff0000';
  $el.style.position = 'fixed';
  $el.style.bottom = 0;
  document.body.appendChild($el);
  screenHeight=window.screen.height / $el.offsetHeight;
  screenWidth=window.screen.width / $el.offsetWidth;
  console.log("Screen Width in cm: "+ screenWidth);
  console.log("Screen Height in cm: "+ screenHeight);
  var screenDiagonalInches = Math.sqrt(Math.pow((window.screen.width / $el.offsetWidth), 2) + Math.pow((window.screen.height / $el.offsetHeight), 2))/ 2.54;
  console.log("Screen Diagonal in in: "+ screenDiagonalInches);
  document.body.removeChild($el);
  //Screen center height in meters
  screenCenterY=(screenHeight/2)/100;

  //Calculate distance form screen based on estimated screen diagonal length and resolution
  //Screen resolution
  var screenResWidth = window.screen.width * window.devicePixelRatio;
  var screenResHeight = window.screen.height * window.devicePixelRatio;

  //distanceFromScreen will be used for initial positioning of the  Surround Left and Right speakers
  // Distance is in meters
  if(screenDiagonalInches<14)
  {
    distanceFromScreen = 0.61; //minimum distance
  }
  else
  {
  distanceFromScreen = 0.61 + (Math.round(screenDiagonalInches-14)/2)*0.15;
  }
  console.log("Estimated distance from screen: " + distanceFromScreen);
}

//Create Camera
function create_BabylonCamera(scene) {
  estimate_ScreenParams();
  //For this example universal camera is more suitable
  //camera = new Camera('camera', new Vector3(0,screenCenterY,distanceFromScreen), scene);
  camera = new UniversalCamera('camera', new Vector3(0,screenCenterY,-distanceFromScreen), scene);
  camera.attachControl(canvas, true);
  scene.setActiveCameraByName('camera');
  // This targets the camera to Front-Middle speaker
  //camera.setTarget(new BABYLON.Vector3(0,0,0));
  camera.fov = SETTINGS.cameraFOV * Math.PI/180;
  camera.minZ = 0.1;
  camera.maxZ = 100;
  ASPECTRATIO = engine.getAspectRatio(camera);

  //For debugging
  console.log("Finished: create_BabylonCamera");
}

//ADD VIRTUAL SPEAKERS
// Used by add_SoundstoMeshes
function add_virtualSpeakers(scene) {
  // Create material
  var speakerMaterialFM = new StandardMaterial("speakerMaterialFM", scene);
  var speakerMaterialFL = new StandardMaterial("speakerMaterialFL", scene);
  var speakerMaterialFR = new StandardMaterial("speakerMaterialFR", scene);
  var speakerMaterialSub = new StandardMaterial("speakerMaterialSub", scene);
  var speakerMaterialSL = new StandardMaterial("speakerMaterialSL", scene);
  var speakerMaterialSR = new StandardMaterial("speakerMaterialSR", scene);
  // Front-Middle speaker.
  boxFM = MeshBuilder.CreateBox("boxFM", {size: 0.05}, scene);
  boxFM.position=new Vector3(0,screenCenterY,distanceFromScreen); 
  speakerMaterialFM.emissiveColor = new Color3(1, 0, 0); //RED
  boxFM.material = speakerMaterialFM;
  // Front-left speaker.
  boxFL = MeshBuilder.CreateBox("boxFL", {size: 0.05}, scene);
  boxFL.position=new Vector3((-screenWidth/2)/100,screenCenterY,distanceFromScreen/2);
  speakerMaterialFL.emissiveColor = new Color3(0, 1, 0); //GREEN
  boxFL.material = speakerMaterialFL;
  // Front-Right speaker.
  boxFR = MeshBuilder.CreateBox("boxFR", {size: 0.05}, scene);
  boxFR.position=new Vector3((screenWidth/2)/100,screenCenterY,distanceFromScreen/2);
  speakerMaterialFR.emissiveColor = new Color3(0, 0, 1); //BLUE
  boxFR.material = speakerMaterialFR;
  // Sub speaker.
  boxSub = MeshBuilder.CreateBox("boxSub", {size: 0.05}, scene);
  boxSub.position=new Vector3(((-screenWidth/2)/100)-0.5,screenCenterY-0.2,distanceFromScreen/2-0.5);
  speakerMaterialSub.emissiveColor = new Color3(0.55, 0, 1); //PURPLE
  boxSub.material = speakerMaterialSub;
  // Surround-Left speaker.
  boxSL = MeshBuilder.CreateBox("boxSL", {size: 0.05}, scene);
  boxSL.position=new Vector3((-screenWidth/2)/100,screenCenterY,-distanceFromScreen);
  speakerMaterialSL.emissiveColor = new Color3(0.93, 1, 0); //YELLOW
  boxSL.material = speakerMaterialSL;
  // Surround-Right speaker.
  boxSR = MeshBuilder.CreateBox("boxSR", {size: 0.05}, scene);
  boxSR.position=new Vector3((screenWidth/2)/100,screenCenterY,-distanceFromScreen);
  speakerMaterialSR.emissiveColor = new Color3(1, 0.4, 0); //ORANGE
  boxSR.material = speakerMaterialSR;
  console.log("Finished: add_virtualSpeakers");
}

// Controlls sound 
// Music starts playing when all 6 sounds are loaded
function soundReady() {
    soundsReady++;
    if (soundsReady === 6) {
        musicFL.attachToMesh(boxFL);
        musicFR.attachToMesh(boxFR);
        musicFM.attachToMesh(boxFM);
        musicSub.attachToMesh(boxSub);
        musicSR.attachToMesh(boxSR);
        musicSL.attachToMesh(boxSL);

        musicFL.play();
        musicFR.play();
        musicFM.play();
        musicSub.play();
        musicSR.play();
        musicSL.play();
        musicControll=true;
    }
}

// Ceates Virtual speakers and attaches sounds to them
function add_SoundstoMeshes(scene) {
    add_virtualSpeakers(scene);

    musicFL = new Sound(
        //Front left
        "Front-left",
        "https://raw.githubusercontent.com/VGFP/jeelizFaceFilter/master/demos/babylonjs/sound/demo_OGG_Files/FrontLeft.ogg",
        scene,
        soundReady,
        { 
        loop: true,
        spatialSound: true,
        distanceModel: "exponential",
        rolloffFactor: 2
        }
    );
    musicFR = new Sound(
        "Front-right",
        //Front right
        "https://raw.githubusercontent.com/VGFP/jeelizFaceFilter/master/demos/babylonjs/sound/demo_OGG_Files/FrontRight.ogg",
        scene,
        soundReady,
        { 
        loop: true,
        spatialSound: true,
        distanceModel: "exponential",
        rolloffFactor: 2
        }
    );
    musicFM = new Sound(
        //Front center
        "Front-center",
        "https://raw.githubusercontent.com/VGFP/jeelizFaceFilter/master/demos/babylonjs/sound/demo_OGG_Files/FrontCenter.ogg",
        scene,
        soundReady,
        { 
        loop: true,
        spatialSound: true,
        distanceModel: "exponential",
        rolloffFactor: 2
        }
    );
    musicSub = new Sound(
        //Sub
        "Sub",
        "https://raw.githubusercontent.com/VGFP/jeelizFaceFilter/master/demos/babylonjs/sound/demo_OGG_Files/Sub.ogg",
        scene,
        soundReady,
        { 
        loop: true,
        spatialSound: true,
        distanceModel: "exponential",
        rolloffFactor: 2
        }
    );
    musicSL = new Sound(
        //Surround left
        "Surround-left",
        "https://raw.githubusercontent.com/VGFP/jeelizFaceFilter/master/demos/babylonjs/sound/demo_OGG_Files/LeftSurr.ogg",
        scene,
        soundReady,
        { 
        loop: true,
        spatialSound: true,
        distanceModel: "exponential",
        rolloffFactor: 2
        }
    );
    musicSR = new Sound(
        //Surround Right
        "Surround-Right",
        "https://raw.githubusercontent.com/VGFP/jeelizFaceFilter/master/demos/babylonjs/sound/demo_OGG_Files/RightSurr.ogg",
        scene,
        soundReady,
        { 
        loop: true,
        spatialSound: true,
        distanceModel: "exponential",
        rolloffFactor: 2
        }
    );

    // Add pause option
    scene.onKeyboardObservable.add((kbInfo) => {
        switch (kbInfo.type) {
            case KeyboardEventTypes.KEYDOWN:
                switch (kbInfo.event.key) {
                    case "a":
                    case "A":
                        if(musicControll)
                        {
                        musicFL.pause();
                        musicFR.pause();
                        musicFM.pause();
                        musicSub.pause();
                        musicSR.pause();
                        musicSL.pause();
                        musicControll=false;
                        }
                        else
                        {
                        musicFL.play();
                        musicFR.play();
                        musicFM.play();
                        musicSub.play();
                        musicSR.play();
                        musicSL.play();
                        musicControll=true;
                        }
                    break
                }
            break;
        }
    });
/* 
    // Sphere material
    sphereMaterial = new StandardMaterial("sphereMat", scene);
    sphereMaterial.diffuseColor = Color3.Green();
    //sphereMaterial.backFaceCulling = false;
	  sphereMaterial.alpha = 0.3;
    // Add Sphere representation of spacial sound maxDistance
    sphereMusicFL = MeshBuilder.CreateSphere("sphereMusicFL", {diameter: 15}, scene);
    sphereMusicFL.material = sphereMaterial;
    sphereMusicFL.position=new Vector3((-screenWidth/2)/100,screenCenterY,0);

    sphereMusicFM = Mesh.CreateSphere("sphereMusicFM", 20, 60, scene); 
    sphereMusicFM.position=new Vector3(0,screenCenterY,0);
    sphereMusicFM.material = sphereMaterial;

    sphereMusicFR = Mesh.CreateSphere("sphereMusicFR", 20, 60, scene);
    sphereMusicFR.position=new Vector3((screenWidth/2)/100,screenCenterY,0); 
    sphereMusicFR.material = sphereMaterial;

    sphereMusicSub = Mesh.CreateSphere("sphereMusicSub", 20, 60, scene);
    sphereMusicSub.material = sphereMaterial;
    sphereMusicSub.position=new Vector3(((-screenWidth/2)/100)-0.5,screenCenterY-0.2,-0.5);

    sphereMusicSL = Mesh.CreateSphere("sphereMusicSL", 20, 60, scene); 
    sphereMusicSL.position=new Vector3((-screenWidth/2)/100,screenCenterY,-Math.sin(20)*distanceFromScreen*distanceFromScreen);
    sphereMusicSL.material = sphereMaterial;

    sphereMusicSR = Mesh.CreateSphere("sphereMusicSR", 20, 60, scene); 
    sphereMusicSR.position=new Vector3((screenWidth/2)/100,screenCenterY,-Math.sin(20)*distanceFromScreen*distanceFromScreen);
    sphereMusicSR.material = sphereMaterial;
*/
    //For debugging
  console.log("Finished: add_SoundstoMeshes");
}

// callback launched if a face is detected or lost:
function detect_callback(isDetected){
    if (isDetected){
      console.log('INFO in detect_callback(): DETECTED');
    } else {
      console.log('INFO in detect_callback(): LOST');
    }
  }

// Find initial rotation of the head
function calibrate_rot(){

};

// build the 3D. called once when Jeeliz Face Filter is OK:
function init_babylonScene(){
  scene.audioListenerPositionProvider = () => {
    return new Vector3(0, screenCenterY, 0);
    };
    audioListenerSphere = MeshBuilder.CreateSphere("audioListener",{diameter: 0.05},scene);
    audioListenerSphere.position = new Vector3(0, screenCenterY, 0);
    pivot = new TransformNode("root");
    pivot.position = new Vector3(0, screenCenterY, 0);
    create_BabylonCamera(scene);
    add_SoundstoMeshes(scene);
    
      // This targets the camera to Front-Middle speaker
    camera.setTarget(boxFM.position);

    //For this demo "ears" are in position (0,0,distanceFromScreen) 
    //so user can see how algorithm works
    // Returns a static position
  
//For debugging
console.log("Finished: init_babylonScene");
};

function main() {
  const faceFilter = require('../node_modules/facefilter/dist/jeelizFaceFilter.module.js');

  faceFilter.init({
    //you can also provide the canvas directly
    //using the canvas property instead of canvasId:
    canvasId: 'jeeFaceFilterCanvas',
    NNCpath: 'https://raw.githubusercontent.com/jeeliz/jeelizFaceFilter/master/dist/', //path to JSON neural network model (NNC.json by default)
    callbackReady: function(errCode, spec){
        if (errCode){
        console.log('AN ERROR HAPPENS. ERROR CODE =', errCode);
        return;
        }
        // [init scene with spec...]
        console.log('INFO: JEEFACEFILTERAPI IS READY');
        init_babylonScene()
    }, //end callbackReady()
    
    //called at each render iteration (drawing loop)
    callbackTrack: function(detectState){
        // Render your scene here
        // [... do something with detectState]
        if (ISDETECTED && detectState.detected<SETTINGS.detectionThreshold-SETTINGS.detectionHysteresis){
            // DETECTION LOST
            detect_callback(false);
            ISDETECTED = false;
          } else if (!ISDETECTED && detectState.detected>SETTINGS.detectionThreshold+SETTINGS.detectionHysteresis){
            // FACE DETECTED
            detect_callback(true);
            ISDETECTED = true;
          }

          if (ISDETECTED){
            if (firstDetection){
              boxFM.parent = pivot;
              boxFL.parent = pivot;
              boxFR.parent = pivot;
              boxSub.parent = pivot;
              boxSL.parent = pivot;
              boxSR.parent = pivot;
              firstDetection = false;
              //ADD SMOOTHING FOR CHANGING SL AND SR POSITION!!!
              // Something is not wroking currnetly :( to be fixed
              /* 
              */
            }
            else 
            {
            // move the cube in order to fit the head:
            const tanFOV = Math.tan(ASPECTRATIO*camera.fov/2); // tan(FOV/2), in radians
            const W = detectState.s;  // relative width of the detection window (1-> whole width of the detection window)
            const D = 1 / (2*W*tanFOV); // distance between the front face of the cube and the camera
            
            // coords in 2D of the center of the detection window in the viewport:
            const xv = detectState.x;
            const yv = detectState.y;
            
            // coords in 3D of the center of the cube (in the view coordinates system):
            var z=-D-0.5;   // minus because view coordinate system Z goes backward. -0.5 because z is the coord of the center of the cube (not the front face)
            var x=xv*D*tanFOV;
            var y=yv*D*tanFOV/ASPECTRATIO;


            var rx = detectState.rx;
            var ry = detectState.ry;
            var rz = detectState.rz;
            
            pivot.rotation.set(-detectState.rx+SETTINGS.rotationOffsetX, detectState.ry, -detectState.rz);
            /*
            NOTE after settings the initial position speakers are only rotating around the central point (users head) 
            */

            }
          }
    
          // reinitialize the state of BABYLON.JS because JEEFACEFILTER have changed stuffs:
          engine.wipeCaches(true);
          
          // trigger the render of the BABYLON.JS SCENE:
          scene.render();
          
          engine.wipeCaches();
          
    } //end callbackTrack()
    });//end init call

}
main();

