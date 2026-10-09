/*
  This component allows the user to import a new wallet using a 12-word mnemonic.
*/

// Global npm libraries
import React, { useCallback } from 'react'
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileExport, faPaste } from '@fortawesome/free-solid-svg-icons'
// import { Clipboard } from '@capacitor/clipboard'

const WalletImport = (props) => {
  const [newMnemonic, setNewMnemonic] = React.useState('')
  const { appData } = props

  // Load mnemonic from clipboard
  const pasteFromClipboard = async () => {
    try {
      const mnemonic = await appData.appUtil.readFromClipboard()
      setNewMnemonic(mnemonic)
    } catch (err) {
      console.warn('Error pasting from clipboard: ', err)
    }
  }

  // Handle input change for mnemonic
  const handleImportMnemonic = async (event) => {
    const inputStr = event.target.value
    const formattedInput = inputStr.toLowerCase()
    setNewMnemonic(formattedInput)
  }

  // Ensure the mnemonic is valid. If it is, then replace the current mnemonic
  // in LocalStorage and reload the page.
  const handleImportWallet = useCallback(async (event) => {
    try {
      const mnemonic = newMnemonic
      const wallet = appData.wallet
      const bchjs = wallet.bchjs

      // Verify the mnemonic is valid.
      const isValid = bchjs.Mnemonic.validate(mnemonic, bchjs.Mnemonic.wordLists().english)
      if (isValid.includes('is not in wordlist')) {
        console.log('Mnemonic is NOT valid')
      } else {
        console.log('Mnemonic is valid')
      }

      // Replace the old mnemonic in LocalStorage with the new one.
      appData.updateLocalStorage({ mnemonic })
      // Reload the app.
      window.location.reload()
    } catch (error) {
      console.warn('Error importing wallet: ', error)
    }
  }, [newMnemonic, appData])

  return (
    <>
      <Container>
        <Row>
          <Col>
            <Card>
              <Card.Body>
                <Card.Title style={{ textAlign: 'center' }}>
                  <h2>
                    <FontAwesomeIcon icon={faFileExport} />{' '}
                    <span>Import Wallet</span>
                  </h2>
                </Card.Title>

                <Card.Text style={{ textAlign: 'center' }}>
                  Enter a 12 word mnemonic below to import your wallet into
                  this app. The app will reload and use the new mnemonic.
                </Card.Text>

                <Container>
                  <Row>
                    <Col xs={12} className='text-break' style={{ textAlign: 'center' }}>
                      <Form onSubmit={(e) => e.preventDefault()}>
                        <Form.Group className='mb-3' controlId='formImportWallet' style={{ display: 'flex', alignItems: 'center' }}>
                          <Form.Control
                            style={{ margin: '1rem' }}
                            type='text'
                            value={newMnemonic}
                            onChange={handleImportMnemonic}
                          />
                          <FontAwesomeIcon
                            icon={faPaste}
                            size='lg'
                            onClick={(e) => pasteFromClipboard(e)}
                            style={{ cursor: 'pointer' }}
                          />
                        </Form.Group>
                      </Form>
                    </Col>
                  </Row>

                  <Row>
                    <Col style={{ textAlign: 'center' }}>
                      <Button variant='primary' onClick={handleImportWallet}>
                        Import
                      </Button>
                    </Col>
                  </Row>

                  <br />
                </Container>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default WalletImport
