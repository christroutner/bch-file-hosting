/*
  This View allows sending and receiving of BCH
*/

// Global npm libraries
import React from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons'

// Local libraries
import RefreshBchBalanceButton from './refresh-bch-balance-button'
import SendCard from './send-card'
import BalanceCard from './balance-card'
import ReceiveCard from './receive-card'

// Working array for storing modal output.
// this.modalBody = []

function BchSend ({ appData }) {
  return (
    <>
      <Container>
        <Row>
          <Col xs={6}>
            <RefreshBchBalanceButton
              appData={appData}
            />
          </Col>
          <Col xs={6} style={{ textAlign: 'right' }}>
            <a href='https://youtu.be/KN1ZMWoLoGs' target='_blank' rel='noreferrer'>
              <FontAwesomeIcon icon={faCircleQuestion} size='lg' />
            </a>
          </Col>
        </Row>
        <br />

        <Row>
          <Col style={{ textAlign: 'center' }}>
            <BalanceCard appData={appData} />
          </Col>
        </Row>
        <br />

        <Row>
          <Col>
            <SendCard
              appData={appData}
            />
          </Col>
        </Row>
        <br />

        <Row>
          <Col>
            <ReceiveCard appData={appData} />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default BchSend
