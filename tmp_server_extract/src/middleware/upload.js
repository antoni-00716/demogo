import multer from "multer";

export function createUploadMiddleware(deps) {
  const { maxZipSizeMb, uploadDir, isSupportedArchiveName } = deps;

  const upload = multer({
    dest: uploadDir,
    limits: { fileSize: maxZipSizeMb * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ok = isSupportedArchiveName(file.originalname);
      cb(ok ? null : new Error("当前仅支持 .zip、.tar.gz、.tgz 项目包"), ok);
    }
  });

  const uploadProjectArchive = [
    upload.fields([
      { name: "project", maxCount: 1 },
      { name: "file", maxCount: 1 },
      { name: "package", maxCount: 1 }
    ]),
    (req, _res, next) => {
      req.file = req.files?.project?.[0] || req.files?.file?.[0] || req.files?.package?.[0] || null;
      next();
    }
  ];

  return { upload, uploadProjectArchive };
}
