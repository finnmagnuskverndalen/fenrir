from datetime import datetime
from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker
from backend.config import DB_PATH

DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class ScanSession(Base):
    __tablename__ = "scan_sessions"

    id = Column(String, primary_key=True)
    target = Column(String, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="running")  # running, complete, failed
    dry_run = Column(Boolean, default=True)
    hosts = relationship("Host", back_populates="session")


class Host(Base):
    __tablename__ = "hosts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("scan_sessions.id"))
    ip = Column(String, nullable=False)
    hostname = Column(String, nullable=True)
    os_guess = Column(String, nullable=True)
    status = Column(String, default="up")
    discovered_at = Column(DateTime, default=datetime.utcnow)
    session = relationship("ScanSession", back_populates="hosts")
    ports = relationship("Port", back_populates="host")
    findings = relationship("Finding", back_populates="host")


class Port(Base):
    __tablename__ = "ports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    host_id = Column(Integer, ForeignKey("hosts.id"))
    port = Column(Integer, nullable=False)
    protocol = Column(String, default="tcp")
    state = Column(String, default="open")
    service = Column(String, nullable=True)
    version = Column(String, nullable=True)
    host = relationship("Host", back_populates="ports")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("scan_sessions.id"))
    host_id = Column(Integer, ForeignKey("hosts.id"))
    cve_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    severity = Column(String, default="info")  # critical, high, medium, low, info
    cvss_score = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    ai_analysis = Column(Text, nullable=True)
    exploit_suggestion = Column(Text, nullable=True)
    detected_by = Column(String, nullable=True)  # nmap, nuclei, manual
    discovered_at = Column(DateTime, default=datetime.utcnow)
    poc_links    = Column(Text, nullable=True)   # JSON list of GitHub POC repos
    tls_result   = Column(Text, nullable=True)   # JSON TLS probe result
    cred_results = Column(Text, nullable=True)   # JSON cred check result
    host = relationship("Host", back_populates="findings")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
