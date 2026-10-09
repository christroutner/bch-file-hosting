/*
  This component allows the user to optimize their wallet by consolidating
  UTXOs. This speeds up all the network calls and results in an improved UX.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Row, Col, Card, Button } from 'react-bootstrap'

// Local libraries
import WaitingModal from '../../waiting-modal'

function OptimizeWallet (props) {
  // State
  const [showModal, setShowModal] = useState(false)
  const [modalBody, setModalBody] = useState([])
  const [hideSpinner, setHideSpinner] = useState(false)
  const [denyClose, setDenyClose] = useState(false)

  // Get props values
  const { wallet } = props.appData

  // Optimize wallet
  const handleOptimize = async () => {
    console.log('Optimize Wallet button clicked.')
    // Show waiting modal
    setShowModal(true)
    setModalBody(['Optimizing wallet...'])
    setDenyClose(true)

    // Optimize wallet
    await wallet.optimize()

    // Show success modal
    setShowModal(true)
    setModalBody(['Your wallet has been optimized!'])
    setDenyClose(false)
    setHideSpinner(true)

    try {
      // Get all UTXOs in the wallet
      const utxos = wallet.utxos.utxoStore
      console.log('utxos: ', utxos)

      // Add up all the UTXOs
      const bchUtxoCnt = utxos.bchUtxos.length
      let fungibleUtxoCnt = utxos.slpUtxos.type1.tokens.length
      if (!fungibleUtxoCnt) fungibleUtxoCnt = 0
      let nftUtxoCnt = utxos.slpUtxos.nft.length
      if (!nftUtxoCnt) nftUtxoCnt = 0
      const totalUtxos = bchUtxoCnt + fungibleUtxoCnt + nftUtxoCnt
      console.log(`bchUtxoCnt: ${bchUtxoCnt}, fungibleUtxoCnt: ${fungibleUtxoCnt}, nftUtxoCnt: ${nftUtxoCnt}`)
      console.log(`total UTXO count: ${totalUtxos}`)

      if (totalUtxos > 10) {
        const newModalBody = [
          'Your wallet has been optimized!',
          'Your wallet still has more than 10 UTXOs. Increased numbers of UTXOs slow down performance. If you have several tokens in your wallet, it is recommended that you store them in a paper wallet. Here is a video explaining how to do that:'
        ]

        newModalBody.push(<a href='https://youtu.be/mRniqpgWdjg' target='_blank' rel='noreferrer'>Video: How to Store SLP Tokens on a Paper Wallet</a>)
        newModalBody.push(<a href='https://paperwallet.fullstack.cash/' target='_blank' rel='noreferrer'>Generate a Paper Wallet</a>)

        setModalBody(newModalBody)
      }
    } catch (err) {
      console.log('Error while trying to count total number of UTXOs: ', err)
    }
  }

  return (
    <>
      <Container>
        <Row>
          <Col>
            <Card>
              <Card.Body>
                <Card.Title style={{ textAlign: 'center' }}>
                  <h2>Optimize Wallet</h2>
                </Card.Title>
                <Card.Text style={{ textAlign: 'center' }}>

                  Clicking the button below will optimize your wallet and make it
                  function faster.
                  <br /><br />
                  <i>How it works</i>: By consolidating
                  as many UTXOs in your wallet as possible, it reduces the total
                  number of UTXOs in your wallet. Fewer UTXOs in your wallet make
                  all network calls faster, and results in an improved user experience.
                  <br /><br />
                  <Button variant='primary' onClick={handleOptimize}>
                    Optimize Wallet
                  </Button>
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {showModal && (
        <WaitingModal
          heading='Optimizing Wallet'
          body={modalBody}
          hideSpinner={hideSpinner}
          denyClose={denyClose}
        />
      )}
    </>
  )
}

export default OptimizeWallet
