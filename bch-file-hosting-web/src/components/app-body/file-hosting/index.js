/*
  File hosting view: choose a file, upload it to the hosting API, and show the
  quote, the already-hosted download link, a no-file prompt, or the API error.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Form } from 'react-bootstrap'

// Local libraries
import config from '../../../config'
import HostingApi from '../../../services/hosting-api'
import FileUploadPage from '../../../services/file-upload-page'
import UploadQuoteView from './upload-quote-view'

function FileHosting (props) {
  const [state, setState] = useState({ status: 'idle' })
  const [busy, setBusy] = useState(false)

  async function handleFile (event) {
    const file = event.target.files && event.target.files[0]
    setBusy(true)
    try {
      const page = new FileUploadPage({ hostingApi: new HostingApi({ config }) })
      setState(await page.upload(file || null))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container style={{ padding: '25px' }}>
      <h2>Host a file on IPFS</h2>
      <p>Pay in BCH, get an IPFS CID and download links.</p>
      <Form.Group controlId='hosting-file'>
        <Form.Label>Choose a file to host</Form.Label>
        <Form.Control type='file' onChange={handleFile} disabled={busy} />
      </Form.Group>
      <br />
      <UploadQuoteView state={state} />
    </Container>
  )
}

export default FileHosting
