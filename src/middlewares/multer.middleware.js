import multer from "multer";

const storage = multer.diskStorage({         //saves uploaded file in local disk
    destination: function (req, file, cb) {  //destination path where the file should be saved
        cb(null, './public/temp')
    },
    filename: function (req, file, cb) {       //uploaded filename
        cb(null, Date.now() + file.originalname);
    }
})

export const upload = multer({ storage })   //initializes multer middleware with specified config