#!/bin/bash

# Auto Update Script for GitHub Repository
# This script pulls the latest changes from a GitHub repository
# and can be scheduled to run periodically using cron

# Configuration
REPO_PATH="/root/pdp-movie"  # Repository path yang telah diupdate
BRANCH="main"                   # Change this to your branch name
LOG_FILE="/var/log/git-auto-update.log"  # Change this to your preferred log location
GIT_EXECUTABLE=$(which git)

# Create log file if it doesn't exist
touch $LOG_FILE

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Error handling function
handle_error() {
    log "ERROR: $1"
    exit 1
}

# Navigate to repository directory
if [ ! -d "$REPO_PATH" ]; then
    handle_error "Repository directory not found: $REPO_PATH"
fi

log "Starting repository update..."
cd $REPO_PATH || handle_error "Failed to change directory to $REPO_PATH"

# Check if directory is a git repository
if [ ! -d ".git" ]; then
    handle_error "Not a git repository: $REPO_PATH"
fi

# Configure git pull strategy to merge (solving divergent branches issue)
$GIT_EXECUTABLE config pull.rebase false

# Store the current commit hash before pulling
OLD_COMMIT=$($GIT_EXECUTABLE rev-parse HEAD)

# Reset any uncommitted changes to prevent conflicts
$GIT_EXECUTABLE reset --hard HEAD
log "Reset repository to HEAD to prevent conflicts"

# Fetch the latest changes
log "Fetching changes from remote repository..."
FETCH_RESULT=$($GIT_EXECUTABLE fetch origin 2>&1)
if [ $? -ne 0 ]; then
    handle_error "Failed to fetch from remote repository: $FETCH_RESULT"
fi

# Check if there are any changes to pull
UPSTREAM="${BRANCH}@{u}"
LOCAL=$($GIT_EXECUTABLE rev-parse @)
REMOTE=$($GIT_EXECUTABLE rev-parse "$UPSTREAM" 2>/dev/null)
FETCH_STATUS=$?

if [ $FETCH_STATUS -ne 0 ]; then
    log "Warning: Unable to determine remote revision. Continuing with pull anyway."
elif [ "$LOCAL" = "$REMOTE" ]; then
    log "Repository is already up to date."
    exit 0
fi

# Pull the latest changes with explicit merge strategy
log "Pulling changes from remote repository..."
PULL_RESULT=$($GIT_EXECUTABLE pull --no-rebase origin $BRANCH 2>&1)
if [ $? -ne 0 ]; then
    # If pull fails, try a more aggressive approach with fetch and reset
    log "Standard pull failed. Attempting alternative update method..."
    $GIT_EXECUTABLE fetch origin $BRANCH
    $GIT_EXECUTABLE reset --hard origin/$BRANCH
    
    if [ $? -ne 0 ]; then
        handle_error "Failed to update repository using alternative method."
    else
        log "Repository updated using fetch and reset method."
    fi
else
    log "Pull completed successfully."
fi

# Get the new commit hash
NEW_COMMIT=$($GIT_EXECUTABLE rev-parse HEAD)

# Log the changes
if [ "$OLD_COMMIT" != "$NEW_COMMIT" ]; then
    CHANGES=$($GIT_EXECUTABLE log --pretty=format:"%h - %an, %ar : %s" $OLD_COMMIT..$NEW_COMMIT)
    log "Repository updated successfully from $OLD_COMMIT to $NEW_COMMIT"
    log "Changes:"
    log "$CHANGES"
    
    # Add post-update commands here
    log "Rebuilding Next.js application..."
    cd $REPO_PATH && npm install
    
    if [ $? -ne 0 ]; then
        log "Warning: npm install failed, but continuing with build"
    fi
    
    cd $REPO_PATH && npm run build
    
    if [ $? -ne 0 ]; then
        handle_error "Failed to build Next.js application."
    fi
    
    # Restart systemd service
    log "Reloading systemd daemon..."
    systemctl daemon-reload
    
    log "Restarting pdpx.service..."
    systemctl restart pdpx.service
    
    # Check service status
    SERVICE_STATUS=$(systemctl is-active pdpx.service)
    if [ "$SERVICE_STATUS" = "active" ]; then
        log "pdpx.service restarted successfully and is active"
    else
        log "ERROR: pdpx.service failed to restart. Current status: $SERVICE_STATUS"
        log "Check service logs with: journalctl -u pdpx.service -n 50"
        # Don't exit with error here to allow future updates to run
    fi
else
    log "No new changes detected after update."
fi

log "Update process completed successfully"
exit 0 