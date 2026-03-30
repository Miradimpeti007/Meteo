#  Infrastructure - Pollution & Météo Project

This directory contains the full infrastructure setup for the application.

The architecture is designed to be:
- Reproducible (Docker Compose)
- Isolated (network separation)
- Highly Available (PostgreSQL + Patroni)
- Observable (Prometheus + Grafana)

---

# Architecture Overview

The infrastructure is composed of:

- **Reverse Proxy**: Nginx (entry point)
- **Backend**: Python service (API placeholder)
- **Database Cluster**: PostgreSQL managed by Patroni
- **Consensus Layer**: etcd
- **Monitoring**: Prometheus + Grafana + cAdvisor
- **Database UI**: pgAdmin

---

# Networks

Two isolated Docker networks are used:

- `net_front` → exposed services (Nginx)
- `net_data` → internal services only:
  - Backend
  - PostgreSQL
  - Patroni
  - etcd
  - Monitoring

The database is **never exposed publicly**.

---

# Getting Started

## 1. Configure environment

At project root:

```bash
cp .env.example .env