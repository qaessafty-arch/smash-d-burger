import 'server-only'
import path from 'node:path'
export const uploadDir = () => process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads')
