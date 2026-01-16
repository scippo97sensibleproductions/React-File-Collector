import {NavLink} from "@mantine/core";
import {Link, useLocation} from "@tanstack/react-router";
import {IconBrandGit, IconHome2, IconSettings2} from "@tabler/icons-react";

interface NavMenuProps {
    onNavigate?: () => void;
}

export const NavMenu = ({onNavigate}: NavMenuProps) => {
    const location = useLocation();
    return (
        <>
            <NavLink
                active={location.pathname === '/'}
                component={Link}
                label="Home"
                leftSection={<IconHome2 size={16} stroke={1.5}/>}
                to="/"
                onClick={onNavigate}
            />
            <NavLink
                active={location.pathname === '/git-diff'}
                component={Link}
                label="Git Diff"
                leftSection={<IconBrandGit size={16} stroke={1.5}/>}
                to="/git-diff"
                onClick={onNavigate}
            />
            <NavLink
                active={location.pathname === '/settings'}
                component={Link}
                label="Settings"
                leftSection={<IconSettings2 size={16} stroke={1.5}/>}
                to="/settings"
                onClick={onNavigate}
            />
        </>
    );
};