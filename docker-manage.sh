#!/bin/bash

# Docker Management Script for Let'sDraw
# Usage: ./docker-manage.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Setup environment file
setup_env() {
    if [ ! -f .env ]; then
        log_info "Creating .env file from .env.docker template..."
        cp .env.docker .env
        log_success "Environment file created. Please review and modify .env as needed."
    else
        log_info "Environment file already exists."
    fi
}

# Development commands
dev_start() {
    log_info "Starting development environment..."
    setup_env
    docker-compose -f docker-compose.dev.yml up --build
}

dev_start_detached() {
    log_info "Starting development environment in background..."
    setup_env
    docker-compose -f docker-compose.dev.yml up --build -d
    log_success "Development environment started. Access at http://localhost:3000"
}

dev_stop() {
    log_info "Stopping development environment..."
    docker-compose -f docker-compose.dev.yml down
    log_success "Development environment stopped."
}

dev_logs() {
    docker-compose -f docker-compose.dev.yml logs -f "${2:-}"
}

dev_clean() {
    log_warning "This will remove all development containers, networks, and volumes."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning development environment..."
        docker-compose -f docker-compose.dev.yml down -v --rmi all
        log_success "Development environment cleaned."
    else
        log_info "Cleanup cancelled."
    fi
}

# Production commands
prod_start() {
    log_info "Starting production environment..."
    setup_env
    docker-compose up --build -d
    log_success "Production environment started. Access at http://localhost:${PORT:-3000}"
}

prod_start_with_nginx() {
    log_info "Starting production environment with Nginx..."
    setup_env
    docker-compose --profile production up --build -d
    log_success "Production environment with Nginx started. Access at http://localhost:${NGINX_PORT:-80}"
}

prod_stop() {
    log_info "Stopping production environment..."
    docker-compose down
    log_success "Production environment stopped."
}

prod_logs() {
    docker-compose logs -f "${2:-letsdraw}"
}

prod_scale() {
    local replicas=${2:-2}
    log_info "Scaling letsdraw service to $replicas replicas..."
    docker-compose up --scale letsdraw=$replicas -d
    log_success "Service scaled to $replicas replicas."
}

prod_clean() {
    log_warning "This will remove all production containers, networks, and volumes."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning production environment..."
        docker-compose down -v --rmi all
        log_success "Production environment cleaned."
    fi
}

# Utility commands
health_check() {
    log_info "Checking service health..."
    docker-compose ps
    echo
    log_info "Testing application endpoint..."
    if curl -f -s http://localhost:${PORT:-3000} > /dev/null; then
        log_success "Application is responding."
    else
        log_error "Application is not responding."
    fi
}

backup_logs() {
    log_info "Creating application logs backup..."
    local backup_file="app-logs-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    docker run --rm \
        -v letsdraw_app-logs:/source \
        -v "$(pwd)":/backup \
        alpine tar czf "/backup/$backup_file" -C /source .
    log_success "Application logs backup created: $backup_file"
}

restore_logs() {
    local backup_file=$2
    if [ -z "$backup_file" ]; then
        log_error "Please specify backup file: ./docker-manage.sh restore-logs <backup-file>"
        exit 1
    fi

    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi

    log_warning "This will overwrite existing application logs."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Restoring logs from backup: $backup_file"
        docker run --rm \
            -v letsdraw_app-logs:/target \
            -v "$(pwd)":/backup \
            alpine tar xzf "/backup/$backup_file" -C /target
        log_success "Application logs restored from backup."
    fi
}

show_stats() {
    log_info "Container resource usage:"
    docker stats --no-stream
}

# Build commands
build() {
    log_info "Building Docker images..."
    docker-compose build
    log_success "Images built successfully."
}

build_no_cache() {
    log_info "Building Docker images without cache..."
    docker-compose build --no-cache
    log_success "Images built successfully without cache."
}

# Cleanup commands
cleanup() {
    log_info "Cleaning up Docker resources..."
    docker system prune -f
    log_success "Docker cleanup completed."
}

cleanup_all() {
    log_warning "This will remove all unused containers, networks, images, and build cache."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Performing complete cleanup..."
        docker system prune -a -f
        log_success "Complete cleanup finished."
    fi
}

# Help function
show_help() {
    echo "Docker Management Script for Let'sDraw"
    echo
    echo "Usage: $0 [command]"
    echo
    echo "Development Commands:"
    echo "  dev-start         Start development environment (foreground)"
    echo "  dev-start-bg      Start development environment (background)"
    echo "  dev-stop          Stop development environment"
    echo "  dev-logs [service] Show development logs"
    echo "  dev-clean         Clean development environment"
    echo
    echo "Production Commands:"
    echo "  prod-start        Start production environment"
    echo "  prod-start-nginx  Start production with Nginx"
    echo "  prod-stop         Stop production environment"
    echo "  prod-logs [service] Show production logs"
    echo "  prod-scale [n]    Scale letsdraw service to n replicas"
    echo "  prod-clean        Clean production environment"
    echo
    echo "Utility Commands:"
    echo "  health            Check service health"
    echo "  backup-logs       Backup application logs"
    echo "  restore-logs <file> Restore logs from backup"
    echo "  stats             Show container resource usage"
    echo "  build             Build Docker images"
    echo "  build-no-cache    Build images without cache"
    echo "  cleanup           Clean unused Docker resources"
    echo "  cleanup-all       Clean all Docker resources"
    echo "  help              Show this help message"
    echo
    echo "Examples:"
    echo "  $0 dev-start-bg   # Start development in background"
    echo "  $0 prod-scale 3   # Scale to 3 application instances"
    echo "  $0 dev-logs letsdraw-dev # Show application logs in development"
}

# Main script logic
main() {
    check_docker

    case "${1:-help}" in
        # Development
        "dev-start")
            dev_start
            ;;
        "dev-start-bg")
            dev_start_detached
            ;;
        "dev-stop")
            dev_stop
            ;;
        "dev-logs")
            dev_logs "$@"
            ;;
        "dev-clean")
            dev_clean
            ;;
        # Production
        "prod-start")
            prod_start
            ;;
        "prod-start-nginx")
            prod_start_with_nginx
            ;;
        "prod-stop")
            prod_stop
            ;;
        "prod-logs")
            prod_logs "$@"
            ;;
        "prod-scale")
            prod_scale "$@"
            ;;
        "prod-clean")
            prod_clean
            ;;
        # Utilities
        "health")
            health_check
            ;;
        "backup-logs")
            backup_logs
            ;;
        "restore-logs")
            restore_logs "$@"
            ;;
        "stats")
            show_stats
            ;;
        "build")
            build
            ;;
        "build-no-cache")
            build_no_cache
            ;;
        "cleanup")
            cleanup
            ;;
        "cleanup-all")
            cleanup_all
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Execute main function
main "$@"