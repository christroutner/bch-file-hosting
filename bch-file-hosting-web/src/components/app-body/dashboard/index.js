/*
  Hosted-files dashboard: load the public feed, list each file and its pins in
  feed order, and offer Refresh and Load more.
*/

// Global npm libraries
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Container } from 'react-bootstrap'

// Local libraries
import config from '../../../config'
import HostingApi from '../../../services/hosting-api'
import DashboardPage from '../../../services/dashboard-page'
import DashboardView from './dashboard-view'

function Dashboard () {
  const [state, setState] = useState({ status: 'idle' })
  const [busy, setBusy] = useState(false)
  const pageRef = useRef(null)

  // One page instance keeps the feed cursor across refresh and load-more.
  const getPage = useCallback(() => {
    if (!pageRef.current) {
      pageRef.current = new DashboardPage({ hostingApi: new HostingApi({ config }) })
    }
    return pageRef.current
  }, [])

  const run = useCallback(async (action) => {
    setBusy(true)
    try {
      setState(await action())
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    run(() => getPage().load())
  }, [getPage, run])

  return (
    <Container style={{ padding: '25px' }}>
      <h2>Hosted files</h2>
      <Button onClick={() => run(() => getPage().load())} disabled={busy}>
        Refresh
      </Button>
      <br />
      <DashboardView state={state} />
      {state.status === 'loaded' && state.hasMore && (
        <Button onClick={() => run(() => getPage().loadMore())} disabled={busy}>
          Load more
        </Button>
      )}
    </Container>
  )
}

export default Dashboard
