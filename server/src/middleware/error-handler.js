import multer from "multer";

export function createErrorHandler(deps) {
  const { maxZipSizeMb, attachErrorDiagnosis, publicContentReview } = deps;

  function createHttpError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  function errorMiddleware(error, _req, res, _next) {
    let message = error instanceof Error ? error.message : "发布失败";
    let statusCode = error.statusCode || (message.includes("仅支持") || message.includes("不支持") || message.includes("超出") ? 400 : 500);

    if (error instanceof multer.MulterError) {
      statusCode = 400;
      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        message = "上传字段不正确。请把项目包放在 project 字段中；为兼容 AI 工具，file 和 package 字段也可以使用。";
      } else if (error.code === "LIMIT_FILE_SIZE") {
        message = `项目包体积过大，当前最多支持${maxZipSizeMb}MB。`;
      } else {
        message = "项目包上传失败，请确认只上传一个 .zip、.tar.gz 或 .tgz 文件。";
      }
    }

    const diagnosis = attachErrorDiagnosis(error, { message, statusCode });
    res.status(statusCode).json({
      error: message,
      inspection: error.inspection,
      contentReview: publicContentReview(error.contentReview),
      diagnosis,
      deploymentEvents: error.deploymentEvents || undefined
    });
  }

  return { createHttpError, errorMiddleware };
}
