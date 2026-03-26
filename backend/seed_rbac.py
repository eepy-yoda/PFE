from app.db.session import SessionLocal
from app.models.rbac import Role, Permission
from app.models.user import User, UserRole
from app.models.project import Project
from app.models.task import Task
from app.models.activity import ActivityLog

def seed_rbac():
    db = SessionLocal()
    try:
        # 1. Define Permissions
        permissions_data = [
            {"name": "view_management_dashboard", "description": "Access to management board"},
            {"name": "manage_workers", "description": "Create and edit worker accounts"},
            {"name": "manage_roles", "description": "Define and update roles/permissions"},
            {"name": "assign_tasks", "description": "Create and assign tasks to workers"},
            {"name": "view_logs", "description": "View system activity logs"},
            {"name": "update_task_status", "description": "Update progress of assigned tasks"},
            {"name": "submit_work", "description": "Submit completed work for review"},
        ]
        
        db_perms = {}
        for p in permissions_data:
            perm = db.query(Permission).filter(Permission.name == p["name"]).first()
            if not perm:
                perm = Permission(**p)
                db.add(perm)
                db.flush()
            db_perms[p["name"]] = perm
            
        # 2. Define Roles
        roles_data = [
            {
                "name": "Admin",
                "description": "Full system access",
                "is_system": True,
                "perms": ["view_management_dashboard", "manage_workers", "manage_roles", "assign_tasks", "view_logs"]
            },
            {
                "name": "Manager",
                "description": "Team oversight and task management",
                "is_system": True,
                "perms": ["view_management_dashboard", "manage_workers", "assign_tasks", "view_logs"]
            },
            {
                "name": "Team Lead",
                "description": "Can manage tasks for their team",
                "is_system": False,
                "perms": ["assign_tasks", "update_task_status", "submit_work"]
            },
            {
                "name": "Worker",
                "description": "Standard employee role",
                "is_system": True,
                "perms": ["update_task_status", "submit_work"]
            }
        ]
        
        for r in roles_data:
            role = db.query(Role).filter(Role.name == r["name"]).first()
            if not role:
                role = Role(name=r["name"], description=r["description"], is_system=r["is_system"])
                role.permissions = [db_perms[pname] for pname in r["perms"] if pname in db_perms]
                db.add(role)
        
        db.commit()
        print("RBAC Seeding completed successfully!")
    except Exception as e:
        print(f"Error seeding RBAC: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_rbac()
