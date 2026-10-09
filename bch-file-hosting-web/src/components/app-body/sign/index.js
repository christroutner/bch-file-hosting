/*
Component for signing a message with a WIF private key.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Row, Col, Form, Button } from 'react-bootstrap'
import { faCopy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

function SignMessage (props) {
  // Convert class state to hooks
  const { wallet, appUtil } = props.appData

  const [sign, setSign] = useState('')
  const [msg, setMsg] = useState('')
  const [bchAddr] = useState(wallet?.walletInfo?.cashAddress)
  const [slpAddr] = useState(wallet?.walletInfo?.slpAddress)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSignMessage = (event) => {
    try {
      event.preventDefault()

      if (!msg) throw new Error('Enter a message to sign.')

      const bchjs = wallet.bchjs

      const wif = props.appData.wallet.walletInfo.privateKey
      const sig = bchjs.BitcoinCash.signMessageWithPrivKey(wif, msg)

      setSign(sig)
      setErr('')
    } catch (err) {
      console.log('Error in handleSignMessage(): ', err)
      setErr(err.message)
      setSign('')
    }
  }

  // Function to copy the value to the clipboard.
  const handleCopyToClipboard = async (value) => {
    appUtil.copyToClipboard(value)

    // show the copied message
    setCopied(true)

    // hide copied message after 1 second
    setTimeout(function () {
      setCopied(false)
    }, 1000)
  }

  const copyIcon = (value) => {
    return <FontAwesomeIcon icon={faCopy} size='lg' onClick={() => handleCopyToClipboard(value)} style={{ cursor: 'pointer', marginLeft: '10px' }} />
  }

  return (
    <>
      <Container>
        <Row>
          <Col>
            <p>
              This view allows you cryptographically sign a message with your
              wallet. These signatures are used in a wide range of applications,
              such as gaining access to
              the <a href='https://t.me/psf_vip' target='_blank' rel='noreferrer'>PSF VIP Telegram channel</a>.
            </p>
            <p>
              Enter any message into the form below and click the button. This
              view will generate a cryptographic signature.
            </p>
          </Col>
        </Row>
        <Row>
          <Col className='text-break'>
            <Form onSubmit={handleSignMessage}>
              <Form.Group className='mb-3' controlId='message'>
                <Form.Label><b>Enter a message to sign.</b></Form.Label>
                <Form.Control type='text' placeholder='' onChange={e => setMsg(e.target.value)} />
              </Form.Group>
              {err && <p style={{ color: 'red', marginBottom: '10px' }}>{`Error: ${err}`}</p>}

              <Button variant='primary' onClick={handleSignMessage}>
                Sign Message
              </Button>
            </Form>
          </Col>
        </Row>
        <br />
        {sign && (
          <div style={{ textAlign: 'center' }}>
            <Row>
              <Col>
                <p>
                  <b>Signature:</b> {sign} {copyIcon(sign)}
                </p>
                <p>
                  <b>BCH Address:</b> {bchAddr} {copyIcon(bchAddr)}
                </p>
                <p>
                  <b>SLP Address:</b> {slpAddr} {copyIcon(slpAddr)}
                </p>
              </Col>

            </Row>
            {copied && (
              <span style={{ color: 'green' }}>
                Copied!
              </span>
            )}
          </div>
        )}
      </Container>
    </>
  )
}

export default SignMessage
