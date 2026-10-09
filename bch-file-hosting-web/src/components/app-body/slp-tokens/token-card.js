/*
  This Card component summarizes an SLP token.
  if a token icon does not exist or cant be loaded , then display a default icon from Jdenticon library.
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card } from 'react-bootstrap'
import Jdenticon from '@chris.troutner/react-jdenticon'
// Local libraries
import InfoButton from './info-button'
import SendTokenButton from './send-token-button'

function TokenCard (props) {
  const { token } = props
  const [icon, setIcon] = useState(token.icon)

  // Update icon state every token.icon changes
  useEffect(() => {
    setIcon(token.icon)
  }, [token.icon])

  return (
    <>
      <Col xs={12} sm={6} lg={4} style={{ padding: '25px' }}>
        <Card>
          <Card.Body style={{ textAlign: 'center' }}>
            {/** If the icon is loaded, display it */
              icon && (
                <Card.Img
                  src={icon}
                  style={{ height: '100px', width: 'auto' }}
                  onError={(e) => {
                    setIcon(null) // Set the icon to null if it fails to load the image url.
                  }}
                />
              )
            }

            {/** If the icon is not loaded, display the Jdenticon   */
              !icon && (
                <Jdenticon size='100' value={token.tokenId} />
              )
            }
            <Card.Title style={{ textAlign: 'center' }}>
              <h4>{props.token.ticker}</h4>
            </Card.Title>

            <Container>
              <Row>
                <Col>
                  {props.token.name}
                </Col>
              </Row>
              <br />

              <Row>
                <Col>Balance:</Col>
                <Col>{props.token.qty}</Col>
              </Row>
              <br />

              <Row>
                <Col>
                  <InfoButton token={props.token} />
                </Col>
                <Col>
                  <SendTokenButton
                    token={props.token}
                    appData={props.appData}
                    refreshTokens={props.refreshTokens}
                  />
                </Col>
              </Row>
            </Container>
          </Card.Body>
        </Card>
      </Col>
    </>
  )
}

export default TokenCard
