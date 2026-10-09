/*
  File status view: look up a CID and show the file name, size, hosting status,
  hosting window, and each pin, or the no-CID prompt / API error.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Button, Container, Form } from 'react-bootstrap'

// Local libraries
import config from '../../../config'
import HostingApi from '../../../services/hosting-api'
import FileStatusPage from '../../../services/file-status-page'
import FileStatusView from './file-status-view'

function FileStatus () {
  const [cid, setCid] = useState('')
  const [state, setState] = useState({ status: 'idle' })
  const [busy, setBusy] = useState(false)

  async function handleSubmit (event) {
    event.preventDefault()
    setBusy(true)
    try {
      const page = new FileStatusPage({ hostingApi: new HostingApi({ config }) })
      setState(await page.lookup(cid))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container style={{ padding: '25px' }}>
      <h2>File hosting status</h2>
      <Form onSubmit={handleSubmit}>
        <Form.Group controlId='status-cid'>
          <Form.Label>IPFS CID</Form.Label>
          <Form.Control
            value={cid}
            placeholder='bafy...'
            onChange={(event) => setCid(event.target.value)}
          />
        </Form.Group>
        <Button style={{ marginTop: '10px' }} type='submit' disabled={busy}>
          Look up
        </Button>
      </Form>
      <br />
      <FileStatusView state={state} />
    </Container>
  )
}

export default FileStatus
