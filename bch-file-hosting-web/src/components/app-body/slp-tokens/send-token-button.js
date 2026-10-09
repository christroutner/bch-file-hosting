/*
  This component renders as a button. When clicked, it opens up a modal
  for sending a quantity of tokens.
  This component requires state, because it's a complex form that is being manipulated
  by the user.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Button, Modal, Container, Row, Col, Form, Spinner } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faPaste } from '@fortawesome/free-solid-svg-icons'

function SendTokenButton ({ token, appData, refreshTokens }) {
  // Convert class state to useState hooks
  const [showAddrWarning, setShowAddrWarning] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [hideSpinner, setHideSpinner] = useState(true)
  const [shouldRefreshOnModalClose, setShouldRefreshOnModalClose] = useState(false)
  const [sendToAddress, setSendToAddress] = useState('')
  const [sendQtyStr, setSendQtyStr] = useState('')
  const [dialogFinished, setDialogFinished] = useState(true)

  // Handler functions
  const handleShowModal = () => setShowModal(true)

  const handleCloseModal = async () => {
    if (!dialogFinished) return

    if (shouldRefreshOnModalClose) {
      setShowModal(false)
      setShouldRefreshOnModalClose(false)
      setStatusMsg('')
      await refreshTokens()
    } else {
      setShowModal(false)
      setStatusMsg('')
      setSendToAddress('')
      setSendQtyStr('')
    }
  }
  const handleUpdateSendToAddr = (event) => {
    const value = event.target.value
    setSendToAddress(value)
    setShowAddrWarning(value.includes('bitcoincash'))
  }
  const handleGetMax = () => {
    setSendQtyStr(token.qty)
  }

  // Click handler that fires when the user clicks the 'Send' button.

  const handleSendTokens = async (e) => {
    e.preventDefault()
    try {
      setStatusMsg('Preparing to send tokens...')
      setHideSpinner(false)
      setDialogFinished(false)
      setShowAddrWarning(false)

      // Validate the quantity
      const qty = parseFloat(sendQtyStr)
      if (isNaN(qty)) throw new Error('Invalid send quantity')

      const wallet = appData.wallet
      const bchjs = wallet.bchjs

      // Validate the address
      let addr = sendToAddress
      if (addr.includes('simpleledger')) {
        addr = bchjs.SLP.Address.toCashAddress(addr)
      }
      if (!addr.includes('bitcoincash')) throw new Error('Invalid address')

      let infoStr = 'Updating UTXOs...'

      setStatusMsg(infoStr)
      await wallet.getUtxos()

      const receiver = [{
        address: addr,
        tokenId: token.tokenId,
        qty
      }]

      infoStr = 'Generating and broadcasting transaction...'
      setStatusMsg(infoStr)

      const txid = await wallet.sendTokens(receiver, 3)
      console.log(`Token sent. TXID: ${txid}`)

      setStatusMsg(<p>Success! <a href={`https://token.fullstack.cash/transactions/?txid=${txid}`} target='_blank' rel='noreferrer'>See on Block Explorer</a></p>)
      setHideSpinner(true)
      setSendQtyStr('')
      setSendToAddress('')
      setShouldRefreshOnModalClose(true)
      setDialogFinished(true)
    } catch (err) {
      console.error('Error in handleSendTokens(): ', err)
      setStatusMsg(`Error sending tokens: ${err.message}`)
      setHideSpinner(true)
      setDialogFinished(true)
    }
  }

  // Load address from clipboard
  const pasteFromClipboard = async () => {
    try {
      const address = await appData.appUtil.readFromClipboard()
      setSendToAddress(address)
    } catch (err) {
      console.warn('Error pasting from clipboard: ', err)
    }
  }

  // Modal JSX
  const getModal = () => {
    return (
      <Modal show={showModal} size='lg' onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title><FontAwesomeIcon icon={faPaperPlane} size='lg' /> Send Tokens: <span style={{ color: 'red' }}>{token.ticker}</span></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Container>
            {/* ... existing Modal.Body content ... */}
            <Row>
              <Col style={{ textAlign: 'center' }}>
                <b>SLP Address:</b>
              </Col>
            </Row>

            <Row>
              <Col xs={10}>
                <Form onSubmit={(e) => e.preventDefault()}>
                  <Form.Group controlId='formBasicEmail' style={{ textAlign: 'center' }}>
                    <Form.Control
                      type='text'
                      placeholder='simpleledger:qqlrzp23w08434twmvr4fxw672whkjy0pyxpgpyg0n'
                      onChange={handleUpdateSendToAddr}
                      value={sendToAddress}
                    />
                  </Form.Group>
                </Form>
              </Col>

              <Col xs={2}>
                <FontAwesomeIcon
                  style={{ cursor: 'pointer' }}
                  icon={faPaste}
                  size='lg'
                  onClick={pasteFromClipboard}
                />
              </Col>
            </Row>
            <br />
            <Row>
              <Col style={{ textAlign: 'center' }}>
                <b>Amount:</b>
              </Col>
            </Row>

            <Row>
              <Col xs={10}>
                <Form style={{ paddingBottom: '10px' }} onSubmit={handleSendTokens}>
                  <Form.Group controlId='formBasicEmail' style={{ textAlign: 'center' }}>
                    <Form.Control
                      type='text'
                      onChange={e => setSendQtyStr(e.target.value)}
                      value={sendQtyStr}
                    />
                  </Form.Group>
                </Form>
              </Col>

              <Col xs={2}>
                <Button onClick={handleGetMax}>Max</Button>
              </Col>
            </Row>
            <br />

            <Row>
              <Col style={{ textAlign: 'center' }}>
                <Button onClick={handleSendTokens}>Send</Button>
              </Col>
            </Row>
            <br />

            {showAddrWarning && (
              <>
                <Row>
                  <Col style={{ textAlign: 'center' }}>
                    <p style={{ color: 'orange' }}>
                      <b>Warning</b>: Careful! Not all Bitcoin Cash wallets are token-aware.
                      If you send this token to a wallet that is not
                      token-aware, it could be burned. It's best practice to
                      only send tokens to 'simpleledger' addresses and not
                      'bitcoincash' addresses.
                    </p>
                  </Col>
                </Row>
                <br />
              </>
            )}
            <Row>
              <Col xs={10}>
                {statusMsg}
              </Col>

              <Col xs={2}>
                {!hideSpinner && <Spinner animation='border' />}
              </Col>
            </Row>

          </Container>
        </Modal.Body>
        <Modal.Footer />
      </Modal>
    )
  }

  return (
    <>
      <Button variant='info' onClick={handleShowModal}>Send</Button>
      {showModal && getModal()}
    </>
  )
}

export default SendTokenButton
