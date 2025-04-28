#!/bin/bash

# Auto Update Script for GitHub Repository
# This script pulls the latest changes from a GitHub repository
# and can be scheduled to run periodically using cron

# Configuration
REPO_PATH="/www/wwwroot/pdpx-movie"  # Repository path yang telah diupdate
BRANCH="main"                   # Change this to your branch name
LOG_FILE="/var/log/git-auto-update.log"  # Change this to your preferred log location
GIT_EXECUTABLE=$(which git)

# Create log file if it doesn't exist
touch $LOG_FILE

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Navigate to repository directory
if [ ! -d "$REPO_PATH" ]; then
    log "ERROR: Repository directory not found: $REPO_PATH"
    exit 1
fi

log "Starting repository update..."
cd $REPO_PATH

# Check if directory is a git repository
if [ ! -d ".git" ]; then
    log "ERROR: Not a git repository: $REPO_PATH"
    exit 1
fi

# Store the current commit hash before pulling
OLD_COMMIT=$($GIT_EXECUTABLE rev-parse HEAD)

# Fetch the latest changes
log "Fetching changes from remote repository..."
FETCH_RESULT=$($GIT_EXECUTABLE fetch origin 2>&1)
if [ $? -ne 0 ]; then
    log "ERROR: Failed to fetch from remote repository: $FETCH_RESULT"
    exit 1
fi

# Check if there are any changes to pull
UPSTREAM="${BRANCH}@{u}"
LOCAL=$($GIT_EXECUTABLE rev-parse @)
REMOTE=$($GIT_EXECUTABLE rev-parse "$UPSTREAM")

if [ "$LOCAL" = "$REMOTE" ]; then
    log "Repository is already up to date."
    exit 0
fi

# Pull the latest changes
log "Pulling changes from remote repository..."
PULL_RESULT=$($GIT_EXECUTABLE pull origin $BRANCH 2>&1)
if [ $? -ne 0 ]; then
    log "ERROR: Failed to pull from remote repository: $PULL_RESULT"
    exit 1
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
    cd $REPO_PATH && npm run build
    
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
    fi
fi

log "Update process completed successfully"
exit 0 