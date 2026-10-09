/*
  This component controls sending of BCH.
*/

// Global npm libraries
import React, { useState, useRef } from 'react'
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faPaste, faRandom } from '@fortawesome/free-solid-svg-icons'

// Local libraries
import WaitingModal from '../../waiting-modal'
import RefreshBchBalance from './refresh-balance'

function SendCard (props) {
  // Dependency injection through props
  const appData = props.appData
  const { bchInitLoaded, asyncBackgroundFinished } = appData.asyncBackGroundInitState

  // Modal State
  const [modalBody, setModalBody] = useState([])
  const [hideSpinner, setHideSpinner] = useState(false)
  const [hideWaitingModal, setHideWaitingModal] = useState(true)
  const [hideModal, setHideModal] = useState(true)

  // Form State
  const [bchAddr, setBchAddr] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [amountUnits, setAmountUnits] = useState('USD')
  const [oppositeUnits, setOppositeUnits] = useState('BCH')
  const [oppositeQty, setOppositeQty] = useState(0)

  // Background bch data loaded finished
  const backgroundDataLoaded = bchInitLoaded || asyncBackgroundFinished

  // Child function references
  const refreshBchBalanceRef = useRef()

  // Update the balance of the wallet.
  async function handleButtonRefreshBalance (appData) {
    // Call the child function
    refreshBchBalanceRef.current.handleRefreshBalance(appData)
  }

  // Encapsulate the state for this component into a single object that can
  // be passed around to subfunctions and subcomponents.
  const sendCardData = {
    modalBody,
    setModalBody,
    hideSpinner,
    setHideSpinner,
    hideWaitingModal,
    setHideWaitingModal,
    hideModal,
    setHideModal,
    bchAddr,
    setBchAddr,
    amountStr,
    setAmountStr,
    amountUnits,
    setAmountUnits,
    oppositeUnits,
    setOppositeUnits,
    oppositeQty,
    setOppositeQty
  }

  // This function is called when the modal is closed.
  function onModalClose () {
    sendCardData.setHideModal(true)

    handleButtonRefreshBalance(appData)
  }

  async function pasteFromClipboard () {
    try {
      const addr = await appData.appUtil.readFromClipboard()
      sendCardData.setBchAddr(addr)
    } catch (err) {
      // Browser implementation. Exit quietly.
    }
  }

  // This is an on-change event handler that updates the amount calculated in
  // both BCH and USD as the user types.
  function handleUpdateAmount (inObj = {}) {
    try {
      const { event, appData, sendCardData } = inObj

      // Update the state of the text box.
      let amountStr = event.target.value
      sendCardData.setAmountStr(amountStr)
      if (!amountStr) amountStr = '0'

      // Convert the string to a number.
      const amountQty = parseFloat(amountStr)

      const bchUsdPrice = appData.bchWalletState.bchUsdPrice
      const bchjs = appData.wallet.bchjs

      // Initialize local variables
      let oppositeQty = 0
      // const amountUsd = 0
      // const amountBch = 0

      // Calculate the amount in the opposite units.
      const currentUnit = sendCardData.amountUnits
      if (currentUnit.includes('USD')) {
        // Convert USD to BCH
        oppositeQty = bchjs.Util.floor8(amountQty / bchUsdPrice)
        // amountUsd = amountQty
        // amountBch = oppositeQty
      } else {
        // Convert BCH to USD
        oppositeQty = bchjs.Util.floor2(amountQty * bchUsdPrice)
        // amountUsd = oppositeQty
        // amountBch = amountQty
      }

      // Update app state
      sendCardData.setOppositeQty(oppositeQty)
    } catch (err) {
      /* exit quietly */
      console.log('Error: ', err)
    }
  }

  // This is a click event handler that toggles the units between BCH and USD.
  function handleSwitchUnits ({ sendCardData }) {
    // Toggle the unit
    let newUnit = ''
    let oppositeUnits = ''
    const oldUnit = sendCardData.amountUnits
    if (oldUnit.includes('USD')) {
      newUnit = 'BCH'
      oppositeUnits = 'USD'
    } else {
      newUnit = 'USD'
      oppositeUnits = 'BCH'
    }

    // Clear the Amount text box
    sendCardData.setAmountStr('')
    sendCardData.setOppositeQty(0)

    // Persist the new units.
    sendCardData.setAmountUnits(newUnit)
    sendCardData.setOppositeUnits(oppositeUnits)
  }

  // Add a new line to the waiting modal.
  function addToModal (inStr, sendCardData) {
    sendCardData.setModalBody(prevBody => {
      prevBody.push(inStr)
      return prevBody
    })
  }

  // Send BCH based to the address in the form, and the amount specified in the
  // form.
  async function handleSendBch ({ sendCardData, appData }) {
    console.log('Sending BCH')
    try {
      // Clear the modal body
      sendCardData.setModalBody([])
      sendCardData.setHideSpinner(false)

      // Open the modal
      sendCardData.setHideModal(false)

      let amountBch
      if (sendCardData.amountUnits === 'USD') {
        amountBch = sendCardData.oppositeQty
      } else {
        amountBch = parseFloat(sendCardData.amountStr)
      }
      console.log('amountBch: ', amountBch)

      if (amountBch < 0.00000546) throw new Error('Trying to send less than dust.')

      let bchAddr = sendCardData.bchAddr
      let infoStr = `Sending ${amountBch} BCH ($${sendCardData.amountUsd} USD) to ${bchAddr}`
      console.log(infoStr)

      // Update modal
      addToModal('Preparing to send bch...', sendCardData)

      const wallet = appData.wallet
      const bchjs = wallet.bchjs

      // If the address is an SLP address, convert it to a cash address.
      if (bchAddr.includes('simpleledger:')) {
        bchAddr = bchjs.SLP.Address.toCashAddress(bchAddr)
      }

      // Convert the BCH to satoshis
      const sats = bchjs.BitcoinCash.toSatoshi(amountBch)

      // Update the wallets UTXOs
      infoStr = 'Updating UTXOs...'
      console.log(infoStr)
      addToModal(infoStr, sendCardData)
      await wallet.getUtxos()

      const receivers = [{
        address: bchAddr,
        amountSat: sats
      }]
      const txid = await wallet.send(receivers)

      // Display TXID
      infoStr = `txid: ${txid}`
      // console.log(infoStr)
      // modalBody.push(infoStr)
      addToModal(infoStr, sendCardData)

      // Link to block explorer
      const explorerUrl = `https://blockchair.com/bitcoin-cash/transaction/${txid}`
      const explorerLink = (<a href={`${explorerUrl}`} target='_blank' rel='noreferrer'>Block Explorer</a>)
      // modalBody.push(explorerLink)
      addToModal(explorerLink, sendCardData)

      sendCardData.setHideSpinner(true)
      sendCardData.setBchAddr('')
      sendCardData.setAmountStr('')
    } catch (err) {
      console.log('Error in handleSendBch(): ', err)

      sendCardData.setModalBody([`Error: ${err.message}`])
      sendCardData.setHideSpinner(true)
    }
  }

  return (
    <>
      {
        hideModal
          ? null
          : (<WaitingModal
              heading='Sending BCH'
              body={modalBody}
              hideSpinner={hideSpinner}
              closeFunc={onModalClose}
              closeModalData={{ appData, sendCardData }}
             />)
      }

      <RefreshBchBalance appData={appData} ref={refreshBchBalanceRef} />

      <Card>
        <Card.Body>
          <Card.Title style={{ textAlign: 'center' }}>
            <h2><FontAwesomeIcon icon={faPaperPlane} size='lg' /> Send</h2>
          </Card.Title>
          <br />

          <Container>
            <Row>
              <Col style={{ textAlign: 'center' }}>
                <b>BCH Address:</b>
              </Col>
            </Row>

            <Row>
              <Col xs={12} style={{ textAlign: 'center' }}>
                <Form onSubmit={(e) => e.preventDefault()}>
                  <Form.Group controlId='formBasicEmail' style={{ display: 'flex', alignItems: 'center' }}>
                    <Form.Control
                      style={{ marginRight: '1rem' }}
                      type='text'
                      placeholder='bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
                      onChange={e => setBchAddr(e.target.value)}
                      value={bchAddr}
                    />
                    <FontAwesomeIcon
                      style={{ cursor: 'pointer' }}
                      icon={faPaste}
                      size='lg'
                      onClick={(e) => pasteFromClipboard()}
                    />
                  </Form.Group>
                </Form>
              </Col>

            </Row>
            <br />

            <Row>
              <Col style={{ textAlign: 'center' }}>
                <b>Amount:</b>
              </Col>
            </Row>

            <Row>
              <Col xs={12}>
                <Form style={{ paddingBottom: '10px' }} onSubmit={(e) => { e.preventDefault(); handleSendBch({ sendCardData, appData }) }}>
                  <Form.Group controlId='formBasicEmail' style={{ textAlign: 'center' }}>
                    <Form.Control
                      type='number'
                      onChange={(event) => handleUpdateAmount({ event, appData, sendCardData })}
                      value={amountStr}
                    />
                  </Form.Group>
                </Form>
              </Col>
            </Row>
            <Row>
              <Col xs={6}>
                <strong>Units</strong> : {amountUnits}
                <FontAwesomeIcon
                  style={{ cursor: 'pointer', marginLeft: '5px' }}
                  icon={faRandom}
                  size='lg'
                  onClick={(e) => handleSwitchUnits({ sendCardData, appData })}
                />
              </Col>
              <Col xs={6} style={{ textAlign: 'right' }}>
                <strong>{oppositeUnits}</strong> : {oppositeQty}
              </Col>
            </Row>
            <br />

            <Row>
              <Col style={{ textAlign: 'center' }}>
                <Button onClick={(e) => handleSendBch({ sendCardData, appData })} disabled={!backgroundDataLoaded}>Send</Button>
              </Col>
            </Row>

          </Container>
        </Card.Body>
      </Card>
    </>
  )
}

export default SendCard
