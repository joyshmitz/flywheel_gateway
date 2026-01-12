# Troubleshooting

Common issues and their solutions.

## Connection Issues

### "Unable to connect to server"

**Symptoms**: Dashboard shows "Disconnected" or API requests fail.

**Solutions**:

1. Check if the gateway server is running:
   ```bash
   curl http://localhost:3000/health
   ```

2. Verify the server URL in your browser
3. Check firewall rules allow the port
4. Review server logs for errors

### "WebSocket connection failed"

**Symptoms**: Real-time updates don't appear, session output doesn't stream.

**Solutions**:

1. Check WebSocket endpoint is accessible:
   ```bash
   wscat -c ws://localhost:3000/ws
   ```

2. If using a reverse proxy, ensure WebSocket upgrade is configured:
   ```nginx
   proxy_http_version 1.1;
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   ```

3. Check for network proxies that block WebSocket

### "Connection timeout"

**Symptoms**: Requests hang then fail with timeout.

**Solutions**:

1. Increase timeout settings in nginx/reverse proxy
2. Check network latency to server
3. Verify DNS resolution is working
4. Check if server is overloaded

## Authentication Issues

### "Invalid token"

**Symptoms**: API requests return 401 Unauthorized.

**Solutions**:

1. Check that JWT_SECRET matches between server restarts
2. Verify token hasn't expired
3. Ensure token is properly formatted in Authorization header:
   ```
   Authorization: Bearer <token>
   ```

### "OAuth callback failed"

**Symptoms**: OAuth flow redirects to error page.

**Solutions**:

1. Verify callback URL matches provider configuration
2. Check provider application settings
3. Ensure HTTPS is properly configured
4. Review server logs for detailed error

## Session Issues

### "Session stuck in 'Starting' state"

**Symptoms**: Session never transitions to Running.

**Solutions**:

1. Check agent is running and healthy
2. Review agent logs for errors
3. Verify provider account is verified
4. Check available system resources

### "Session output not appearing"

**Symptoms**: Session shows Running but output panel is empty.

**Solutions**:

1. Check WebSocket connection is established
2. Try refreshing the page
3. Check browser console for JavaScript errors
4. Verify session ID in URL is correct

### "Session failed immediately"

**Symptoms**: Session goes to Failed state within seconds.

**Solutions**:

1. Check the error message in session detail
2. Review agent logs around the failure time
3. Verify provider account has sufficient quota
4. Check for rate limiting issues

## Account Issues

### "Account verification failed"

**Symptoms**: Linked account shows Error status.

**Solutions**:

1. Verify API key is correct and active
2. Check key has required permissions
3. Ensure provider service is operational
4. Try re-linking the account

### "Rate limit exceeded"

**Symptoms**: Account shows Cooldown status, requests fail with 429.

**Solutions**:

1. Wait for cooldown period to expire
2. Add additional accounts for load balancing
3. Reduce concurrent session count
4. Contact provider to increase limits

### "Tokens expired"

**Symptoms**: OAuth-linked account shows Expired status.

**Solutions**:

1. Click Re-authenticate on the account
2. Complete OAuth flow again
3. If persistent, revoke and re-link from scratch

## Database Issues

### "Database connection failed"

**Symptoms**: Server fails to start, database errors in logs.

**Solutions**:

1. Verify DATABASE_URL is correct
2. Check database server is running
3. Verify credentials and permissions
4. For SQLite, check file permissions

### "Migration failed"

**Symptoms**: `bun db:migrate` fails with error.

**Solutions**:

1. Check migration files in `apps/gateway/src/db/migrations/`
2. Verify database connectivity
3. Try rolling back and re-applying:
   ```bash
   bun db:rollback
   bun db:migrate
   ```

## Performance Issues

### "Slow dashboard loading"

**Symptoms**: Dashboard takes >5 seconds to load.

**Solutions**:

1. Check network tab for slow requests
2. Verify server isn't overloaded
3. Consider enabling caching
4. Reduce data pagination limits

### "High memory usage"

**Symptoms**: Server consumes >2GB RAM.

**Solutions**:

1. Check for memory leaks in logs
2. Reduce max concurrent sessions
3. Lower WebSocket max payload size
4. Restart server to clear memory

### "Session output lag"

**Symptoms**: Output streams with significant delay.

**Solutions**:

1. Check network latency
2. Reduce output buffering
3. Verify WebSocket connection health
4. Consider output pagination for large sessions

## Getting Help

If you can't resolve an issue:

1. **Gather information**:
   - Server version (`/health` endpoint)
   - Browser and OS version
   - Relevant log entries
   - Steps to reproduce

2. **Check existing issues**: [GitHub Issues](https://github.com/Dicklesworthstone/flywheel_gateway/issues)

3. **Create a new issue** with gathered information

4. **Join community discussions** for help from other users

## Diagnostic Commands

```bash
# Check server health
curl http://localhost:3000/health

# View server logs
docker compose logs -f gateway

# Check database connectivity
bun db:test

# Validate configuration
bun run config:validate

# Run diagnostics
bun run diagnostics
```
