/*
 This Sweep component allows users to sweep a private key and transfer any
 BCH or SLP tokens into their wallet.
*/

// Global npm libraries
import React from 'react'
import { Container, Row, Col, Form, Button, Modal, Spinner } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons'
import Sweeper from 'bch-token-sweep'

// let _this

const SweepWif = (props) => {
  const { appData } = props
  console.log('appData', appData)
  const [wifToSweep, setWifToSweep] = React.useState('')
  const [showModal, setShowModal] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState('')
  const [hideSpinner, setHideSpinner] = React.useState(false)

  // shouldRefreshOnModalClose: false

  // Helper function to validate WIF
  const validateWIF = (WIF) => {
    if (typeof WIF !== 'string') return false
    if (WIF.length !== 52) return false
    if (WIF[0] !== 'L' && WIF[0] !== 'K') return false
    return true
  }

  // Update wallet state function
  const updateWalletState = async () => {
    const wallet = appData.wallet
    const bchBalance = await wallet.getBalance({ bchAddress: wallet.walletInfo.cashAddress })
    await wallet.initialize()
    const slpTokens = await wallet.listTokens(wallet.walletInfo.cashAddress)
    appData.updateBchWalletState({ walletObj: { bchBalance, slpTokens }, appData })
  }

  // Handle sweep function
  const handleSweep = async (e) => {
    e.preventDefault()
    try {
      console.log(`Sweeping this WIF: ${wifToSweep}`)

      // Set modal initial state
      setShowModal(true)
      setHideSpinner(false)
      setStatusMsg('')

      // Input validation
      const isWIF = validateWIF(wifToSweep)
      if (!isWIF) {
        setHideSpinner(true)
        setStatusMsg(<b style={{ color: 'red' }}>Input is not a WIF private key.</b>)
        return
      }

      try {
        const walletWif = appData.wallet.walletInfo.privateKey
        const toAddr = appData.wallet.slpAddress

        // Instance the Sweep library
        const sweep = new Sweeper(wifToSweep, walletWif, appData.wallet)
        await sweep.populateObjectFromNetwork()

        // Constructing the sweep transaction
        const hex = await sweep.sweepTo(toAddr)
        const txid = await appData.wallet.ar.sendTx(hex)

        // Generate status message
        const newStatusMsg = (
          <>
            <p>Sweep succeeded!</p>
            <p>Transaction ID: {txid}</p>
            <p>
              <a href={`https://blockchair.com/bitcoin-cash/transaction/${txid}`} target='_blank' rel='noreferrer'>
                TX on Blockchair BCH Block Explorer
              </a>
            </p>
            <p>
              <a href={`https://token.fullstack.cash/transactions/?txid=${txid}`} target='_blank' rel='noreferrer'>
                TX on token explorer
              </a>
            </p>
          </>
        )

        setHideSpinner(true)
        setStatusMsg(newStatusMsg)
        setWifToSweep('')

        await updateWalletState()
      } catch (err) {
        setHideSpinner(true)
        setStatusMsg(<b style={{ color: 'red' }}>{`Error: ${err.message}`}</b>)
      }
    } catch (err) {
      console.error('Error in handleSweep(): ', err)
    }
  }

  // Modal component
  const getModal = () => (
    <Modal show={showModal} size='lg' onHide={() => setShowModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Sweeping...</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container>
          <Row>
            {!hideSpinner && (
              <Col style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ marginRight: '10px' }}>Sweeping private key...</span>  <Spinner animation='border' />
              </Col>
            )}
          </Row>
          <br />
          {statusMsg && (
            <Row>
              <Col style={{ textAlign: 'center' }}>{statusMsg}</Col>
            </Row>
          )}
        </Container>
      </Modal.Body>
      <Modal.Footer />
    </Modal>
  )

  return (
    <>
      <Container>
        <Row>
          <Col style={{ textAlign: 'right' }}>
            <a href='https://youtu.be/QW9xixHaEJE' target='_blank' rel='noreferrer'>
              <FontAwesomeIcon icon={faCircleQuestion} size='lg' />
            </a>
          </Col>
        </Row>

        <Row>
          <Col>
            <p>
              This View is used to 'sweep' a private key. This will transfer
              any BCH or SLP tokens from a paper wallet to your web wallet.
              Paper wallets are used to store BCH and tokens. You
              can <a href='https://paperwallet.fullstack.cash/' target='_blank' rel='noreferrer'>generate paper wallets here</a>.
            </p>
            <p>
              Paste the private key of a paper wallet below and click the button
              to sweep the funds. The private key must be in WIF format. It will
              start with the letter 'K' or 'L'.
            </p>
          </Col>
        </Row>

        <Row>
          <Col>
            <Form onSubmit={handleSweep}>
              <Form.Group controlId='formWif' style={{ textAlign: 'center' }}>
                <Form.Control
                  type='text'
                  placeholder='KzJqZxi5XSo36woCy7MFVNRPDpfp8x8FpkhRvrErKBBrDXRVY9Ft'
                  onChange={(e) => setWifToSweep(e.target.value)}
                  value={wifToSweep}
                />
              </Form.Group>
            </Form>
          </Col>
        </Row>
        <br />

        <Row style={{ textAlign: 'center' }}>
          <Col>
            <Button variant='info' onClick={handleSweep}>
              Sweep
            </Button>
          </Col>
        </Row>
      </Container>
      {showModal && getModal()}
    </>
  )
}

export default SweepWif
