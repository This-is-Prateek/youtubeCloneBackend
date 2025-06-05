import multer from "multer";

let storage
try {
    storage = multer.diskStorage({         //saves uploaded file in local disk
        destination: function (req, file, cb) {  //destination path where the file should be saved
            cb(null, './public/temp')
        },
        filename: function (req, file, cb) {       //uploaded filename
            cb(null, Date.now() + file.originalname);
        }
    })
} catch (error) {
    console.log("Error in multer middleware: ", error.message);
}

export const upload = multer({ storage })   //initializes multer middleware with specified config