/*
  This card displays the users balance in  BCH.
*/

// Global npm libraries
import React, { useEffect, useState } from 'react'
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCoins } from '@fortawesome/free-solid-svg-icons'

const BalanceCard = (props) => {
  const { appData } = props
  const [sats, setSats] = useState('')
  const [bchBalance, setbchBalance] = useState('')
  const [usdBalance, setusdBalance] = useState('')

  const { bchInitLoaded, asyncBackgroundFinished } = appData.asyncBackGroundInitState

  // Calculate balances if wallet is successfully loaded!
  useEffect(() => {
    try {
      const bchjs = appData.wallet.bchjs
      if (bchjs && appData.asyncInitSucceeded) {
        const sats = appData.bchWalletState.bchBalance
        const bchBalance = bchjs.BitcoinCash.toBitcoinCash(sats)
        const usdBalance = bchjs.Util.floor2(bchBalance * appData.bchWalletState.bchUsdPrice)

        setSats(sats)
        setbchBalance(bchBalance)
        setusdBalance(usdBalance)
      }
    } catch (error) {
      // console.warn(error)
    }
  }, [appData])
  // Background bch data loaded finished
  const backgroundDataLoaded = bchInitLoaded || asyncBackgroundFinished
  const backgroundDataError = !bchInitLoaded && asyncBackgroundFinished

  return (
    <>
      <Card>
        <Card.Body>
          <Card.Title style={{ textAlign: 'center' }}>
            <h2><FontAwesomeIcon icon={faCoins} size='lg' /> Balance</h2>
          </Card.Title>
          <br />

          {bchInitLoaded && (
            <Container>
              <Row>
                <Col>
                  <b>USD</b>: ${usdBalance}
                </Col>
              </Row>

              <Row>
                <Col>
                  <b>BCH</b>: {bchBalance}
                </Col>
              </Row>

              <Row>
                <Col>
                  <b>Satoshis</b>: {sats}
                </Col>
              </Row>
            </Container>)}
          {backgroundDataError && (
            <Container>
              <span style={{ color: 'red' }}>Balance could not be loaded!</span>
            </Container>
          )}

          {!backgroundDataLoaded && appData.asyncInitSucceeded && (
            <div className='balance-spinner-container'>
              <Spinner animation='border' />
            </div>
          )}
        </Card.Body>
      </Card>
    </>
  )
}

export default BalanceCard
