const http2 = require('http2')
const fs = require('fs')
const path = require('path')
const mime = require('mime-types')

const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_METHOD,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} = http2.constants

const options = {
  key: fs.readFileSync('./localhost-privkey.pem'),
  cert: fs.readFileSync('./localhost-cert.pem'),
  allowHTTP1: true
}

const server = http2.createSecureServer(options)

const serverRoot = './public'

const etag = ({ ino, size, mtime }) => `"${[ino, size, mtime.toISOString()].join('-')}"`

const statCheck = (stat, headers) => {
  headers['last-modified'] = stat.mtime.toUTCString()
  headers['ETag'] = etag(stat)
}

server.on('stream', (stream, headers) => {
  const reqPath = headers[HTTP2_HEADER_PATH]
  const reqMethod = headers[HTTP2_HEADER_METHOD]
  const pathFile = path.join(serverRoot, reqPath)

  const onError = err => {
    console.log(err)
    if (err.code === 'ENOENT') {
      stream.respond({ ':status': HTTP_STATUS_NOT_FOUND })
    } else {
      stream.respond({ ':status': HTTP_STATUS_INTERNAL_SERVER_ERROR })
    }
    stream.end()
  }

  stream.respondWithFile(pathFile, {
    'content-type': `${mime.lookup(pathFile)}; charset=utf-8`
  },
  { statCheck, onError })
})

server.listen(8843)
