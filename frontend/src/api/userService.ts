// User Service API Functions

export async function fetchUserById(id: string) {
  try {
    const response = await fetch(`/api/users/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.status} ${response.statusText}`);
    }
    
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    throw error;
  }
}