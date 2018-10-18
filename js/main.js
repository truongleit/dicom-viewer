// window.onload = function() {

//     var prefix = './dcm/vhf.';
//     var prefix1 = './dcm-1/dicom-';
//     var dicom = [];

//     // for (var i = 1; i < 66; i++) {
//     //     var finalString = '';
//     //     var temp = i.toString();
//     //     finalString = prefix + i + '.dcm';
//     //     dicom.push(finalString);
//     // }

//     for (var i = 1; i < 209; i++) {
//         var finalString = '';
//         var temp = i.toString();
//         finalString = prefix1 + i + '.dcm';
//         dicom.push(finalString);
//     }

//     console.log(dicom);

//     // Volume //

//     volume = new X.volume();
//     volume.file = dicom;

//     // X-axis //
//     sliceX = new X.renderer2D();
//     sliceX.container = 'sliceX';
//     sliceX.orientation = 'AXIAL';
//     sliceX.init();
//     sliceX.add(volume);
//     sliceX.render();

//     // Y-axis //
//     sliceY = new X.renderer2D();
//     sliceY.container = 'sliceY';
//     sliceY.orientation = 'SAGITTAL';
//     sliceY.init();

//     // Z-axis //
//     sliceZ = new X.renderer2D();
//     sliceZ.container = 'sliceZ';
//     sliceZ.orientation = 'SAGITTAL';
//     sliceZ.init();

//     // 3D rendering //
//     ren3d = new X.renderer3D();
//     ren3d.container = '3d';
//     ren3d.init();

//     sliceX.onShowtime = function() {

//         sliceY.add(volume);
//         sliceY.render();
//         sliceZ.add(volume);
//         sliceZ.render();
//         ren3d.add(volume);
//         ren3d.render();

//     };

// };

var files = [];
var _dataArray = [];
var _filenames = [];
var counter;
var reader;
var v;
var sliceX, sliceY, sliceZ;
var threeD;


$(document).ready(function() {

    $('.slider').slick({
        infinite: true,
        slidesToShow: 1,
        autoplay: true,
        autoplaySpeed: 5000
    });
    $('.upload-button').click(function() {
        $('#file_inp').trigger('click');
    });
    $('.minimize').click(function() {
        $('.viewer').addClass('close');
    });

    $("#file_inp").change(function() {

        $('.viewer').removeClass('close');
        $('.viewer').addClass('open');


        files = document.getElementById("file_inp").files;

        //
        // try to create the 3D renderer
        //
        _webGLFriendly = true;
        try {
            // try to create and initialize a 3D renderer
            threeD = new X.renderer3D();
            threeD.container = '3d';
            threeD.init();
        } catch (Exception) {

            // no webgl on this machine
            _webGLFriendly = false;

        }
        //
        // create the 2D renderers
        // .. for the X orientation
        sliceX = new X.renderer2D();
        sliceX.container = 'sliceX';
        sliceX.orientation = 'X';
        sliceX.init();
        // .. for Y
        sliceY = new X.renderer2D();
        sliceY.container = 'sliceY';
        sliceY.orientation = 'Y';
        sliceY.init();
        // .. and for Z
        sliceZ = new X.renderer2D();
        sliceZ.container = 'sliceZ';
        sliceZ.orientation = 'Z';
        sliceZ.init();

        // we create the X.volume container and attach all DICOM files
        v = new X.volume();

        //v.file = urls;

        counter = files.length;
        reader = new FileReader();

        recursiveLoading(0);

    });
});


function recursiveLoading(idx) {
    if (counter > 0) {
        reader.onload = function(file) {
            var arrayBuffer = reader.result;
            var byteArray = new Uint8Array(arrayBuffer);
            _filenames[idx] = file.name + ".DCM";
            _dataArray[idx] = arrayBuffer; // _dataArray[idx] = byteArray.buffer; // Alternative!
            //_filenames.push(file.name + ".DCM");
            //_dataArray.push(arrayBuffer);
            counter--;

            recursiveLoading(idx + 1);
        };
        reader.readAsArrayBuffer(files[idx]);
    } else {
        //
        // THE VOLUME DATA
        //
        // create a X.volume
        volume = new X.volume();
        // .. and attach the single-file dicom in .NRRD format
        // this works with gzip/gz/raw encoded NRRD files but XTK also supports other
        // formats like MGH/MGZ
        volume.file = _filenames;
        volume.filedata = _dataArray;
        // we also attach a label map to show segmentations on a slice-by-slice base
        //volume.labelmap.file = 'http://x.babymri.org/?seg.nrrd';
        // .. and use a color table to map the label map values to colors
        //volume.labelmap.colortable.file = 'http://x.babymri.org/?genericanatomy.txt';

        // add the volume in the main renderer
        // we choose the sliceX here, since this should work also on
        // non-webGL-friendly devices like Safari on iOS
        sliceX.add(volume);

        // start the loading/rendering
        sliceX.render();


        //
        // THE GUI
        //
        // the onShowtime method gets executed after all files were fully loaded and
        // just before the first rendering attempt
        sliceX.onShowtime = function() {

            //
            // add the volume to the other 3 renderers
            //
            sliceY.add(volume);
            sliceY.render();
            sliceZ.add(volume);
            sliceZ.render();

            if (_webGLFriendly) {
                threeD.add(volume);
                threeD.render();
            }

            // now the real GUI
            var gui = new dat.GUI({ autoPlace: false });
            $('.render-container').append(gui.domElement);

            // the following configures the gui for interacting with the X.volume
            var volumegui = gui.addFolder('Volume');
            // now we can configure controllers which..
            // .. switch between slicing and volume rendering
            var vrController = volumegui.add(volume, 'volumeRendering');
            // .. configure the volume rendering opacity
            var opacityController = volumegui.add(volume, 'opacity', 0, 1);
            // .. and the threshold in the min..max range
            var lowerThresholdController = volumegui.add(volume, 'lowerThreshold',
                volume.min, volume.max);
            var upperThresholdController = volumegui.add(volume, 'upperThreshold',
                volume.min, volume.max);
            var lowerWindowController = volumegui.add(volume, 'windowLow', volume.min,
                volume.max);
            var upperWindowController = volumegui.add(volume, 'windowHigh', volume.min,
                volume.max);
            // the indexX,Y,Z are the currently displayed slice indices in the range
            // 0..dimensions-1
            var sliceXController = volumegui.add(volume, 'indexX', 0,
                volume.dimensions[0] - 1);
            var sliceYController = volumegui.add(volume, 'indexY', 0,
                volume.dimensions[1] - 1);
            var sliceZController = volumegui.add(volume, 'indexZ', 0,
                volume.dimensions[2] - 1);
            volumegui.open();



        };
    }
};