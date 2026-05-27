/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import multer, { diskStorage, memoryStorage } from 'multer'
import path from 'path'
import fs from 'fs'

class UploadMiddlewware {
  constructor(storageObject) {
    this.storagePath = storageObject.path || './public/temp/'
    this.fileTypes = storageObject.fileTypes || ''

    this.fileParam = storageObject.fileParam || 'file'
    this.allowedExtensions = storageObject.allowedExtensions || ['csv']
    this.fileFields = storageObject.fileFields || [
      { name: 'file1', maxCount: 1 },
      { name: 'file2', maxCount: 1 }
      // Add more fields as needed
    ]

    this.multer = multer
    this.diskStorage = diskStorage
    this.memoryStorage = memoryStorage
  }

  get storageConfig() {
    return this.diskStorage({
      destination: (req, file, cb) => {
        try {
          // Detect file type and set subfolder
          let subFolder = ''
          const isVideo = file.mimetype.startsWith('video/') || /\.(mp4|mov|avi)$/i.test(file.originalname)
          const isImage =
            file.mimetype.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalname)

          if (isVideo) subFolder = 'video'
          else if (isImage) subFolder = 'image'
          else subFolder = '' // fallback (default folder)

          const destPath = path.join(this.storagePath, subFolder)
          fs.mkdirSync(destPath, { recursive: true }) // ensure folder exists

          cb(null, destPath)
        } catch (err) {
          cb(err, null)
        }
      },

      filename: (req, file, cb) => {
        try {
          const filetypes = this.fileTypes
          const newFileName = file.fieldname + '-' + Date.now() + path.extname(file.originalname)
          if (filetypes && filetypes != '') {
            const mimetype = filetypes.test(file.mimetype)
            const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
            if (!mimetype || !extname) throw new Error('File not match our extentions.')
          }
          cb(null, newFileName)
        } catch (error) {
          return cb(new Error(error.message), null)
        }
      }
    })
  }

  get multerConf() {
    return this.multer({
      storage: this.storageConfig
    })
  }

  get multerMemoryConf() {
    return this.multer({
      limits: {
        fileSize: 1024 * 1024 * 50 // 50 MB (in bytes)
      },
      fileFilter: (req, file, cb) => {
        // Check file extension (allow only 'jpg' and 'png' for example)
        const fileExtension = file.originalname.split('.').pop().toLowerCase()
        const isValidExtension = this.allowedExtensions.includes(fileExtension)

        if (!isValidExtension) {
          return cb(new Error('Invalid file extension'))
        }
        cb(null, true)
      }
    })
  }

  get singleFileUpload() {
    return this.multerConf.single(this.fileParam)
  }

  get multipleKnownFields() {
    return this.multerConf.fields(this.fileFields)
  }

  get unknownFields() {
    return this.multerConf.any()
  }

  get memoryUpload() {
    return this.multerMemoryConf.single(this.fileParam)
  }

  get multipleUpload() {
    return this.multerConf.any()
  }
}

export { UploadMiddlewware }
