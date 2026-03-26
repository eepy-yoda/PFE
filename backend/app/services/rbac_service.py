from sqlalchemy.orm import Session
from app.models.rbac import Role, Permission
from app.schemas.rbac import RoleCreate, RoleUpdate, PermissionCreate
from uuid import UUID

class RBACService:
    def get_permissions(self, db: Session):
        return db.query(Permission).all()

    def create_permission(self, db: Session, perm_in: PermissionCreate):
        db_perm = Permission(**perm_in.model_dump())
        db.add(db_perm)
        db.commit()
        db.refresh(db_perm)
        return db_perm

    def get_roles(self, db: Session):
        return db.query(Role).all()

    def create_role(self, db: Session, role_in: RoleCreate):
        db_role = Role(
            name=role_in.name,
            description=role_in.description,
            is_system=role_in.is_system
        )
        if role_in.permission_ids:
            permissions = db.query(Permission).filter(Permission.id.in_(role_in.permission_ids)).all()
            db_role.permissions = permissions
        
        db.add(db_role)
        db.commit()
        db.refresh(db_role)
        return db_role

    def update_role(self, db: Session, role_id: UUID, role_in: RoleUpdate):
        db_role = db.query(Role).filter(Role.id == role_id).first()
        if not db_role:
            return None
        
        data = role_in.model_dump(exclude_unset=True)
        if "permission_ids" in data:
            perm_ids = data.pop("permission_ids")
            permissions = db.query(Permission).filter(Permission.id.in_(perm_ids)).all()
            db_role.permissions = permissions
            
        for key, value in data.items():
            setattr(db_role, key, value)
            
        db.commit()
        db.refresh(db_role)
        return db_role

    def delete_role(self, db: Session, role_id: UUID):
        db_role = db.query(Role).filter(Role.id == role_id).first()
        if not db_role or db_role.is_system:
            return False
        db.delete(db_role)
        db.commit()
        return True

rbac_service = RBACService()
