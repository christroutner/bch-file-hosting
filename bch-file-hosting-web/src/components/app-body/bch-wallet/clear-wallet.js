/*
This Card component is used to clear the Local Storage and reset the wallet.
*/

// Global npm libraries
import React from 'react'
import { Container, Row, Col, Card, Button } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'

const WalletClear = (props) => {
  const { removeLocalStorageItem } = props.appData

  // Delete wallet data from Local Storage and reload the app.
  const handleClearLocalStorage = () => {
    console.log('Deleting wallet and reloading page.')
    // Delete the mnemonic from Local Storage
    removeLocalStorageItem('mnemonic')
    // Reload the app.
    window.location.reload()
  }

  return (
    <>
      <Container>
        <Row>
          <Col>
            <Card>
              <Card.Body>
                <Card.Title style={{ textAlign: 'center' }}>
                  <h2>
                    <FontAwesomeIcon icon={faTriangleExclamation} />{' '}
                    <span>Clear Local Storage</span>
                  </h2>
                </Card.Title>

                <Card.Text style={{ textAlign: 'center' }}>
                  Clicking the button below will clear the Local Storage, which
                  will reload the app with a newly created wallet.
                  <br />
                  <b>
                    Be sure to write down your 12-word mnemonic to back
                    up your wallet before clicking the button!
                  </b>.
                  <br /><br />
                  <Button variant='danger' onClick={handleClearLocalStorage}>
                    Delete Wallet
                  </Button>
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default WalletClear
