/*
  This card displays the users BCH and SLP address and QR code
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Row, Col, Card, Form } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet } from '@fortawesome/free-solid-svg-icons'
import { QRCodeSVG } from 'qrcode.react'

const ReceiveCard = ({ appData }) => {
  const [addrSwitch, setAddrSwitch] = useState(false)
  const [displayCopyMsg, setDisplayCopyMsg] = useState(false)

  // Determine which address to display
  const addrToDisplay = !addrSwitch
    ? appData.bchWalletState.cashAddress
    : appData.bchWalletState.slpAddress

  // Copy the selected address to the clipboard when the QR image is clicked
  const handleCopyAddress = async (value) => {
    appData.appUtil.copyToClipboard(value)

    // Display the copied message
    setDisplayCopyMsg(true)

    // Clear the copied message after some time
    setTimeout(() => {
      setDisplayCopyMsg(false)
    }, 1000)
  }

  // Event handler for address switch toggle
  const handleAddrSwitchToggle = (event) => {
    setAddrSwitch(event.target.checked)
  }

  return (
    <>
      <Card>
        <Card.Body style={{ textAlign: 'center' }}>
          <Card.Title>
            <h2><FontAwesomeIcon icon={faWallet} size='lg' /> Receive</h2>
          </Card.Title>
          <br />

          <Container>
            <Row>
              <Col style={{ color: 'green', marginBottom: '20px' }}>
                {displayCopyMsg ? 'Copied' : null}
              </Col>
            </Row>

            <Row>
              <Col>
                <QRCodeSVG
                  style={{ cursor: 'pointer' }}
                  className='qr-code'
                  value={addrToDisplay}
                  size={256}
                  fgColor='#333'
                  onClick={() => { handleCopyAddress(addrToDisplay) }}
                />
              </Col>
            </Row>
            <Row>
              <Col style={{ marginTop: '20px' }}>
                <p>{addrToDisplay}</p>
              </Col>
            </Row>

            <Row>
              <Col xs={4} />
              <Col xs={4}>
                <Form>
                  <Form.Check
                    type='switch'
                    id='address-switch'
                    onChange={e => handleAddrSwitchToggle(e)}
                  />
                </Form>
              </Col>
              <Col xs={4} />
            </Row>
          </Container>
        </Card.Body>
      </Card>
    </>
  )
}

export default ReceiveCard
