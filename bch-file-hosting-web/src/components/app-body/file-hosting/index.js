/*
  File hosting view: choose a file, upload it to the hosting API, then show the
  quote (with a payment QR code and expiry countdown), pay it from the browser
  wallet, poll for confirmation, and show the hosting result or the expired/
  pending/error message.
*/

// Global npm libraries
import React, { useRef, useState } from 'react'
import { Button, Container, Form } from 'react-bootstrap'

// Local libraries
import config from '../../../config'
import BrowserWallet from '../../../services/browser-wallet'
import HostingApi from '../../../services/hosting-api'
import FileUploadPage from '../../../services/file-upload-page'
import UploadQuoteView from './upload-quote-view'

function FileHosting (props) {
  const { appData } = props
  const [state, setState] = useState({ status: 'idle' })
  const [busy, setBusy] = useState(false)
  const pageRef = useRef(null)

  // One page instance holds the open quote across upload, pay, and poll.
  function getPage () {
    if (!pageRef.current) {
      const wallet = appData && appData.wallet ? new BrowserWallet({ wallet: appData.wallet }) : null
      pageRef.current = new FileUploadPage({ hostingApi: new HostingApi({ config }), wallet })
    }
    return pageRef.current
  }

  async function handleFile (event) {
    const file = event.target.files && event.target.files[0]
    setBusy(true)
    try {
      setState(await getPage().upload(file || null))
    } finally {
      setBusy(false)
    }
  }

  async function handlePay () {
    setBusy(true)
    try {
      const page = getPage()
      const txid = await page.payFromWallet()
      if (!txid) {
        setState(page.getViewModel())
        return
      }
      setState(await page.waitForConfirmation())
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
      {state.status === 'quote' && (
        <Button style={{ marginTop: '10px' }} onClick={handlePay} disabled={busy}>
          Pay now
        </Button>
      )}
      <br />
      <UploadQuoteView state={state} />
    </Container>
  )
}

export default FileHosting
